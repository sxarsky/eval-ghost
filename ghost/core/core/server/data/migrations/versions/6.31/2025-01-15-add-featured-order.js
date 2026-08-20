const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('posts', 'featured_order', {
    type: 'integer',
    nullable: true
});
