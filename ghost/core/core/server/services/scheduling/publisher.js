const models = require('../../models');

/**
 * isDue
 *
 * Returns true if a post's publish_at is at or before the given time.
 *
 * @param {Object} post - Bookshelf Post model instance
 * @param {Date} [now=new Date()] - Current time for boundary comparison
 * @returns {boolean}
 */
function isDue(post, now = new Date()) {
    const publishAt = post.get('publish_at');
    if (!publishAt) {
        return false;
    }
    return new Date(publishAt) <= now;
}

/**
 * tryPublish
 *
 * Attempts to publish a single scheduled post. Idempotent: checks post status
 * in the DB before publishing so restarting the scheduler never double-publishes.
 *
 * @param {Object} post - Bookshelf Post model instance with status 'scheduled'
 * @returns {Promise<boolean>} true if published, false if skipped
 */
async function tryPublish(post) {
    // Re-fetch current status to guard against double-publish across restarts
    const fresh = await models.Post.findOne({id: post.id}, {columns: ['id', 'status']});

    if (!fresh || fresh.get('status') !== 'scheduled') {
        return false;
    }

    await models.Post.edit({status: 'published', published_at: new Date()}, {id: post.id});
    return true;
}

module.exports = {isDue, tryPublish};
