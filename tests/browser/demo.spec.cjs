const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const screenshotDir = path.resolve('test-results/screenshots');
const modes = ['list', 'details', 'thumbnails', 'slide'];
test.beforeEach(async ({ page }) => { await page.goto('/'); await expect(page.getByTestId('gallery')).toBeVisible(); });
for (const mode of modes) test(`renders ${mode} mode`, async ({ page }) => {
  await page.getByLabel('Demo view').selectOption(mode);
  await expect(page.locator(`input[name="displayType"][value="${mode}"]`)).toBeChecked();
  await expect(page.locator('[data-id="sample-05"]').first()).toBeVisible();
  await page.waitForTimeout(400);
  fs.mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotDir, `${mode}.png`), animations: 'disabled' });
});
test('selects a media item and opens information', async ({ page }) => {
  await page.locator('[data-id="sample-05"]').first().click();
  await expect(page.getByTestId('selection')).toContainText('sample-05');
  await expect(page.locator('.info')).toContainText('Study 05');
});
test('pages in both directions without external fixtures', async ({ page }) => {
  await page.getByTestId('next-page').click();
  await expect(page.getByTestId('page')).toHaveText('Page 3 of 3');
  await expect(page.locator('[data-id="sample-09"]').first()).toBeVisible();
  await page.getByTestId('previous-page').click();
  await expect(page.getByTestId('page')).toHaveText('Page 2 of 3');
});
test('supports custom thumbnail renderers', async ({ page }) => {
  await page.getByLabel('Custom renderer').check();
  await expect(page.locator('.custom-tile').first()).toContainText('custom renderer');
  await page.locator('.custom-tile').first().click();
  await expect(page.getByTestId('selection')).toContainText('sample-05');
});
test('captures mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('gallery')).toBeVisible();
  fs.mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotDir, 'mobile.png'), animations: 'disabled' });
});
