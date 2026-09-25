const moment = require('moment');

class MrrStatsService {
    /**
     * @param {object} deps
     * @param {import('knex').Knex} deps.knex
     **/
    constructor({knex}) {
        this.knex = knex;
    }

    /**
     * Get the current total MRR, grouped by currency (ascending order)
     * @returns {Promise<MrrByCurrency[]>}
     */
    async getCurrentMrr() {
        const knex = this.knex;
        const rows = await knex('members_stripe_customers_subscriptions')
            .select(knex.raw(`plan_currency as currency`))
            .select(knex.raw(`SUM(mrr) AS mrr`))
            .groupBy('plan_currency')
            .orderBy('currency');

        if (rows.length === 0) {
            // Add a USD placeholder to always have at least one currency
            rows.push({
                currency: 'usd',
                mrr: 0
            });
        }

        return rows;
    }

    /**
     * Get the current MRR contribution of each tier, grouped by tier and currency.
     * Useful for dashboards that want to break recurring revenue down by tier.
     * @returns {Promise<MrrByTier[]>}
     */
    async getMrrByTier() {
        const knex = this.knex;
        const rows = await knex('members_stripe_customers_subscriptions')
            .select(knex.raw(`products.id AS tier`))
            .select(knex.raw(`products.name AS tier_name`))
            .select(knex.raw(`members_stripe_customers_subscriptions.plan_currency AS currency`))
            .select(knex.raw(`members_stripe_customers_subscriptions.plan_interval AS cadence`))
            .select(knex.raw(`SUM(members_stripe_customers_subscriptions.plan_amount) AS amount`))
            .join('stripe_prices', 'stripe_prices.stripe_price_id', '=', 'members_stripe_customers_subscriptions.stripe_price_id')
            .join('stripe_products', 'stripe_products.stripe_product_id', '=', 'stripe_prices.stripe_product_id')
            .join('products', 'products.id', '=', 'stripe_products.product_id')
            .whereNot('members_stripe_customers_subscriptions.mrr', 0)
            .groupBy('tier', 'tier_name', 'currency', 'cadence');

        // Collapse the per-cadence rows into a single monthly contribution per tier/currency
        /** @type {Object.<string, MrrByTier>} */
        const byTier = {};
        for (const row of rows) {
            const key = `${row.tier}:${row.currency}`;
            if (!byTier[key]) {
                byTier[key] = {
                    tier: row.tier,
                    tier_name: row.tier_name,
                    currency: row.currency,
                    mrr: 0
                };
            }

            // Yearly plans bill for 12 months up front, so normalise them to a
            // monthly figure before adding them to the tier total.
            const amount = Number(row.amount);
            const monthly = row.cadence === 'year'
                ? Math.floor(amount / 12)
                : amount;

            byTier[key].mrr += monthly;
        }

        return Object.values(byTier).sort((a, b) => {
            return a.currency.localeCompare(b.currency) || b.mrr - a.mrr;
        });
    }

    /**
     * Get the MRR deltas for all days (from old to new), grouped by currency (ascending alphabetically)
     * @param {string} [dateFrom] - Start date to fetch deltas from
     * @returns {Promise<MrrDelta[]>} The deltas sorted from new to old
     */
    async fetchAllDeltas(dateFrom) {
        const knex = this.knex;
        const startDate = dateFrom
            ? moment.utc(dateFrom).startOf('day').utc().format('YYYY-MM-DD HH:mm:ss')
            : moment.utc().subtract(90, 'days').startOf('day').utc().format('YYYY-MM-DD HH:mm:ss');
        const rows = await knex('members_paid_subscription_events')
            .select('currency')
            // In SQLite, DATE(created_at) would map to a string value, while DATE(created_at) would map to a JSDate object in MySQL
            // That is why we need the cast here (to have some consistency)
            .select(knex.raw('CAST(DATE(created_at) as CHAR) as date'))
            .select(knex.raw(`SUM(mrr_delta) as delta`))
            .where('created_at', '>=', startDate)
            .groupByRaw('CAST(DATE(created_at) as CHAR), currency');
        return rows;
    }

    /**
     * Returns a list of the MRR history for each day and currency, including the current MRR per currency as meta data.
     * The respons is in ascending date order, and currencies for the same date are always in ascending order.
     * @param {Object} [options]
     * @param {string} [options.dateFrom] - Start date to fetch history from
     * @returns {Promise<MrrHistory>}
     */
    async getHistory(options = {}) {
        // Fetch current total amounts and start counting from there
        const totals = await this.getCurrentMrr();

        const rows = await this.fetchAllDeltas(options.dateFrom);

        rows.sort((rowA, rowB) => {
            const dateA = new Date(rowA.date);
            const dateB = new Date(rowB.date);
        
            return dateA - dateB || rowA.currency.localeCompare(rowB.currency);
        });

        // Get today in UTC (default timezone)
        const today = moment().format('YYYY-MM-DD');

        const results = [];

        // Create a map of the totals by currency for fast lookup and editing

        /** @type {Object.<string, number>}*/
        const currentTotals = {};
        for (const total of totals) {
            currentTotals[total.currency] = total.mrr;
        }

        // Loop in reverse order (needed to have correct sorted result)
        for (let i = rows.length - 1; i >= 0; i -= 1) {
            const row = rows[i];

            if (currentTotals[row.currency] === undefined) {
                // Skip unexpected currencies that are not in the totals
                continue;
            }

            // Convert JSDates to YYYY-MM-DD (in UTC)
            const date = moment(row.date).format('YYYY-MM-DD');

            if (date > today) {
                // Skip results that are in the future for some reason
                continue;
            }

            results.unshift({
                date,
                mrr: Math.max(0, currentTotals[row.currency]),
                currency: row.currency
            });

            currentTotals[row.currency] -= row.delta;
        }

        // Now also add the oldest days we have left over and do not have deltas
        const oldestDate = rows.length > 0 ? moment(rows[0].date).add(-1, 'days').format('YYYY-MM-DD') : today;

        // Note that we also need to loop the totals in reverse order because we need to unshift
        for (let i = totals.length - 1; i >= 0; i -= 1) {
            const total = totals[i];
            results.unshift({
                date: oldestDate,
                mrr: Math.max(0, currentTotals[total.currency]),
                currency: total.currency
            });
        }

        return {
            data: results,
            meta: {
                totals
            }
        };
    }
}

module.exports = MrrStatsService;

/**
 * @typedef MrrByCurrency
 * @type {Object}
 * @property {number} mrr
 * @property {string} currency
 */

/**
 * @typedef MrrByTier
 * @type {Object}
 * @property {string} tier Tier (product) id
 * @property {string} tier_name Tier (product) name
 * @property {string} currency
 * @property {number} mrr MRR contribution of this tier
 */

/**
 * @typedef MrrDelta
 * @type {Object}
 * @property {Date} date
 * @property {string} currency
 * @property {number} delta MRR change on this day
 */

/**
 * @typedef {Object} MrrRecord
 * @property {string} date In YYYY-MM-DD format
 * @property {string} currency
 * @property {number} mrr MRR on this day
 */

/**
 * @typedef {Object} MrrHistory
 * @property {MrrRecord[]} data List of the total members by status for each day, including the paid deltas paid_subscribed and paid_canceled
 * @property {Object} meta
 * @property {MrrByCurrency[]} meta.totals
 */
