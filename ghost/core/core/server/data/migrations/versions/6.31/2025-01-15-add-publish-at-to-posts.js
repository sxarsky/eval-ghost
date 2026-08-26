const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('posts', 'publish_at', {
    type: 'dateTime',
    nullable: true
});
