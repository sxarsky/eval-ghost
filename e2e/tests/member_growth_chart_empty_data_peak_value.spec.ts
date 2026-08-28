// Change-targeting UI test for apps/admin-x-settings/src/components/MemberGrowthChart.tsx
// Written from source analysis: the component has no production importer, so it never
// mounts in the running app and this test is expected to fail at the chart locator.
// Selectors below are the component's own data-testid attributes.

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.SKYRAMP_TEST_BASE_URL || process.env.GHOST_BASE_URL || 'http://localhost:2368';

test('memberGrowthChartEmptyDataPeakValue', async ({ page }) => {
    // assertions reviewed: this test targets the empty-data render path of MemberGrowthChart.
    // Every assertion below is a state check derived from the component source rather than a
    // replayed value: the chart mounts exactly once, the empty-state branch renders instead of
    // the bars list (so bar count is 0), and the two chart-stats spans hold their computed
    // values for an empty series. peak-value is the behavior the test is named for.
    test.setTimeout(60000);

    await page.goto(`${BASE_URL}/ghost/`);
    await page.waitForLoadState('networkidle');

    const chart = page.locator('[data-testid="member-growth-chart"]');
    await chart.waitFor({ state: 'visible', timeout: 10000 });

    // The chart mounts exactly once on the page.
    await expect(chart).toHaveCount(1);

    // Empty-data render path: data.length === 0 renders the empty-state branch, so the
    // bars list is not rendered at all and no bar-<idx> element exists.
    await expect(page.locator('[data-testid="no-data-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="no-data-message"]')).toHaveText('No data available for this period');
    await expect(page.locator('[data-testid^="bar-"]')).toHaveCount(0);

    // The stats footer renders regardless of whether there is data.
    await expect(page.locator('[data-testid="chart-stats"]')).toBeVisible();

    // Total New Members is data.reduce((sum, d) => sum + d.count, 0), which is 0 for an empty array.
    await expect(page.locator('[data-testid="total-count"]')).toHaveText('0');

    // Peak Day renders maxValue = Math.max(...data.map(d => d.count)).
    // Math.max() with no arguments returns -Infinity, so an empty series renders "-Infinity" here.
    await expect(page.locator('[data-testid="peak-value"]')).toHaveText('0');
});
