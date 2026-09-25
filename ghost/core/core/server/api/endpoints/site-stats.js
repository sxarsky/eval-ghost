/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'siteStats',

    read: {
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        async query() {
            return {
                postsTotal: 0,
                postsPublished: 0,
                postsDrafts: 0,
                tagsTotal: 0,
                membersTotal: 0,
                viewsAllTime: 0
            };
        }
    }
};

module.exports = controller;
