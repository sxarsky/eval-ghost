const models = require('../../models');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'site_stats',

    read: {
        statusCode: 200,
        headers: {
            cacheInvalidate: false
        },
        options: [],
        data: [],
        validation: {},
        permissions: {
            method: 'browse'
        },
        async query() {
            const [postsTotal, postsPublished, postsDrafts, tagsTotal, membersTotal] = await Promise.all([
                models.Post.findPage({filter: 'type:post', limit: 1}).then(r => r.meta.pagination.total),
                models.Post.findPage({filter: 'type:post+status:published', limit: 1}).then(r => r.meta.pagination.total),
                models.Post.findPage({filter: 'type:post+status:draft', limit: 1}).then(r => r.meta.pagination.total),
                models.Tag.findPage({limit: 1}).then(r => r.meta.pagination.total),
                models.Member.findPage({limit: 1}).then(r => r.meta.pagination.total)
            ]);

            return {
                site_stats: [{
                    postsTotal,
                    postsPublished,
                    postsDrafts,
                    tagsTotal,
                    membersTotal,
                    viewsAllTime: 0
                }]
            };
        }
    }
};

module.exports = controller;
