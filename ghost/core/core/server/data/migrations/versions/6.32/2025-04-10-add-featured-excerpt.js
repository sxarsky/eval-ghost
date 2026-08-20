const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('posts', 'featured_excerpt', {
    type: 'string',
    maxlength: 280,
    nullable: true
});
