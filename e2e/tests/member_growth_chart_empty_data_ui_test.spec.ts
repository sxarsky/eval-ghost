// Skyramp Testbot — UI test written from code analysis (PR #74).
//
// Target: apps/admin-x-settings/src/components/MemberGrowthChart.tsx
//
// This test is EXPECTED TO FAIL, and that failure is the finding:
//
//   1. MemberGrowthChart has no production importer (verified repo-wide), so it
//      never mounts and none of its data-testid handles exist in the running app.
//   2. Even once mounted, the component computes
//          const maxValue = Math.max(...data.map(d => d.count));
//      at line 20 — BEFORE the `data.length === 0` guard at line 40. For an empty
//      series Math.max() returns -Infinity, so `peak-value` renders "-Infinity"
//      instead of "0"; for an absent series `data.map` throws a TypeError and the
//      whole component fails to mount.
//
// The API response is stubbed so the empty-series path is exercised deterministically.

import {expect, test} from '@playwright/test';

const ADMIN_ANALYTICS_URL = '/ghost/#/analytics/growth';
const MEMBER_GROWTH_API = '**/ghost/api/admin/analytics/member-growth*';

test('member growth chart renders an empty series without leaking -Infinity', async ({page}) => {
    test.setTimeout(60000);

    await page.route(MEMBER_GROWTH_API, async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                start_date: '2026-07-28',
                end_date: '2026-08-27',
                data: []
            })
        });
    });

    await page.goto(ADMIN_ANALYTICS_URL);
    await page.waitForLoadState('networkidle');

    const chart = page.getByTestId('member-growth-chart');
    await chart.waitFor({state: 'visible', timeout: 10000});

    await expect(page.getByTestId('no-data-message')).toHaveText('No data available for this period');
    await expect(page.getByTestId('date-range')).toHaveText('2026-07-28 to 2026-08-27');

    // The empty-series defect: Math.max() over an empty array yields -Infinity.
    await expect(page.getByTestId('peak-value')).toHaveText('0');
    await expect(page.getByTestId('total-count')).toHaveText('0');
    await expect(page.getByTestId('chart-stats')).toBeVisible();
    await expect(page.getByTestId('bar-0')).toHaveCount(0);
});

test('member growth chart survives an absent data series', async ({page}) => {
    test.setTimeout(60000);

    await page.route(MEMBER_GROWTH_API, async (route) => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                start_date: '2026-07-28',
                end_date: '2026-08-27'
            })
        });
    });

    await page.goto(ADMIN_ANALYTICS_URL);
    await page.waitForLoadState('networkidle');

    // `data.map` on an undefined prop throws before the empty-state guard is reached,
    // so the chart container itself must still render.
    const chart = page.getByTestId('member-growth-chart');
    await chart.waitFor({state: 'visible', timeout: 10000});

    await expect(page.getByTestId('no-data-message')).toBeVisible();
    await expect(page.getByTestId('chart-stats')).toBeVisible();
    await expect(page.getByTestId('peak-value')).toHaveText('0');
    await expect(page.getByTestId('total-count')).toHaveText('0');
    await expect(page.getByTestId('bar-0')).toHaveCount(0);
});
