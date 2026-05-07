import {expect, test} from '@/helpers/playwright';

/**
 * External API test for Ghost Admin posts browse endpoint.
 * Covers GET /ghost/api/admin/posts/ response shape.
 */
test.describe('Ghost Admin - Posts API', () => {
    test('browse posts returns a valid list response', async ({page}) => {
        const response = await page.request.get('/ghost/api/admin/posts/?limit=5');

        expect(response.ok()).toBeTruthy();

        const body = await response.json();

        expect(body).toHaveProperty('posts');
        expect(Array.isArray(body.posts)).toBe(true);

        expect(body).toHaveProperty('meta');
        expect(body.meta).toHaveProperty('pagination');
        expect(typeof body.meta.pagination.total).toBe('number');
    });

    test('browse posts respects limit parameter', async ({page}) => {
        const response = await page.request.get('/ghost/api/admin/posts/?limit=2');

        expect(response.ok()).toBeTruthy();

        const body = await response.json();
        expect(body.posts.length).toBeLessThanOrEqual(2);
    });
});
