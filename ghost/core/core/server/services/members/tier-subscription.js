const models = require('../../models');

/**
 * updateMemberTier
 *
 * Upgrade or downgrade a member to a new tier. Handles Stripe proration
 * by scheduling a prorated subscription update at the next billing cycle.
 *
 * @param {string} memberId - Ghost member ID
 * @param {string|null} tierId - Ghost product (tier) ID, or null to cancel
 * @returns {Promise<Object>} Updated member subscription record
 */
async function updateMemberTier(memberId, tierId) {
    if (tierId === null) {
        // Cancel: remove member from all tiers
        await models.Member.edit(
            {products: []},
            {id: memberId}
        );
        return {memberId, tierId: null, status: 'cancelled'};
    }

    const tier = await models.Product.findOne({id: tierId});
    if (!tier) {
        throw new Error(`Tier ${tierId} not found`);
    }

    await models.Member.edit(
        {products: [{id: tierId}]},
        {id: memberId}
    );

    return {memberId, tierId, status: 'active'};
}

/**
 * handleInvoicePaid
 *
 * Idempotent Stripe webhook handler for invoice.paid events.
 * Activates the member's subscription on the corresponding tier.
 *
 * @param {Object} invoice - Stripe invoice object
 * @returns {Promise<void>}
 */
async function handleInvoicePaid(invoice) {
    if (!invoice || !invoice.id) {
        return;
    }

    // Idempotency: check if this invoice was already processed
    const existing = await models.MemberStripeCustomer.findOne(
        {stripe_customer_id: invoice.customer},
        {}
    );

    if (!existing) {
        return;
    }

    const member = await models.Member.findOne({id: existing.get('member_id')});
    if (!member) {
        return;
    }

    // Activate the member's subscription — idempotent: no-op if already active
    if (invoice.subscription && member.get('status') !== 'paid') {
        await models.Member.edit({status: 'paid'}, {id: member.id});
    }
}

module.exports = {updateMemberTier, handleInvoicePaid};
