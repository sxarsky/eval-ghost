/**
 * normalizeSlug
 *
 * Normalizes a raw string into a URL-safe slug.
 *
 * @param {string} raw - The input string to normalize
 * @param {Object} [opts] - Options
 * @param {boolean} [opts.preserveUnicode=false] - When true, Unicode letters/marks are preserved
 * @returns {string} The normalized slug
 */
function normalizeSlug(raw, opts = {}) {
    if (!raw || typeof raw !== 'string') {
        return '';
    }

    let slug = raw.trim();

    // Lowercase
    slug = slug.toLowerCase();

    if (opts.preserveUnicode) {
        // Keep Unicode letters/numbers but still strip punctuation and separators
        slug = slug.replace(/[^\p{L}\p{N}\s-]/gu, '');
    } else {
        // Strip everything that is not ASCII word chars, whitespace, or hyphens
        slug = slug.replace(/[^\w\s-]/g, '');
    }

    // Collapse whitespace and underscores to hyphens
    slug = slug.replace(/[\s_]+/g, '-');

    // Remove consecutive hyphens
    slug = slug.replace(/-{2,}/g, '-');

    // Strip leading/trailing hyphens
    slug = slug.replace(/^-+|-+$/g, '');

    return slug;
}

module.exports = normalizeSlug;
