const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

/**
 * Create a legacy tier and reassign existing subscribers.
 *
 * Any member that has a status of 'paid' but no product association
 * is reassigned to the Default Product (legacy tier).
 */
module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Ensuring legacy tier exists and reassigning existing paid subscribers');

        // Find the Default Product (free tier does not apply)
        const defaultProduct = await knex('products')
            .where({slug: 'default-product'})
            .first('id');

        if (!defaultProduct) {
            logging.warn('Default Product not found — skipping legacy tier migration');
            return;
        }

        // Find paid members who are not yet assigned to any product
        const orphanedMembers = await knex('members')
            .leftJoin('members_products', 'members.id', 'members_products.member_id')
            .where('members.status', 'paid')
            .whereNull('members_products.member_id')
            .select('members.id');

        if (orphanedMembers.length === 0) {
            logging.info('No orphaned paid members found');
            return;
        }

        logging.info(`Reassigning ${orphanedMembers.length} paid member(s) to legacy tier`);

        const rows = orphanedMembers.map(m => ({
            member_id: m.id,
            product_id: defaultProduct.id
        }));

        await knex('members_products').insert(rows);
    },

    async function down(knex) {
        // Not reversible without knowing which rows were inserted
        logging.warn('Legacy tier migration rollback: no action taken');
    }
);
