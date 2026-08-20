const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        await knex.schema.table('members', (table) => {
            table.text('notification_preferences').nullable();
        });
        const defaultPrefs = JSON.stringify({newsletter: true, comment_replies: true, weekly_digest: false});
        await knex('members').whereNull('notification_preferences').update({notification_preferences: defaultPrefs});
    },
    async function down(knex) {
        await knex.schema.table('members', (table) => {
            table.dropColumn('notification_preferences');
        });
    }
);
