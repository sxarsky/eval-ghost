const imageTransform = require('@tryghost/image-transform');

// Width (in pixels) of the small thumbnail generated alongside each uploaded
// image for use in the admin media library grid. The height is derived
// automatically to preserve the original aspect ratio.
const THUMBNAIL_MAX_WIDTH = 100;

/**
 * Generate a small thumbnail for an uploaded image.
 *
 * Reads the original image from `sourcePath`, produces a down-scaled copy no
 * wider than THUMBNAIL_MAX_WIDTH and writes it to `thumbnailPath`.
 *
 * @param {string} sourcePath - storage path of the original (unprocessed) image
 * @param {string} thumbnailPath - path the generated thumbnail is written to
 * @param {Object} [options]
 * @param {number} [options.timeout] - processing timeout in seconds
 * @returns {Promise<void>}
 */
module.exports.generateThumbnail = function generateThumbnail(sourcePath, thumbnailPath, options = {}) {
    return imageTransform.resizeFromPath({
        in: sourcePath,
        out: thumbnailPath,
        maxWidth: THUMBNAIL_MAX_WIDTH,
        timeout: options.timeout
    });
};

module.exports.THUMBNAIL_MAX_WIDTH = THUMBNAIL_MAX_WIDTH;
