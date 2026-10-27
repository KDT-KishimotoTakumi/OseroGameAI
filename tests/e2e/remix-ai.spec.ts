import { expect, test } from '@playwright/test';
test('3難易度、AI応答、先後交代と取消', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('jiso.settings', JSON.stringify({ motion: true, sound: false })),
  );
  await page.goto('/');
  await expect(page.locator('#difficulty option')).toHaveText(['ノーマル', 'ハード', 'スーパーハード']);
  for (const level of ['standard', 'advanced', 'super-hard']) {
    await page.locator('#ai').click();
    await page.locator('#difficulty').selectOption(level);
    await page.locator('.cell[aria-disabled="false"]').first().click();
    await page.locator('#confirm').click();
    await expect(page.locator('.status')).toContainText('2手', { timeout: 15000 });
    await expect(page.locator('.status')).toContainText('シアンの手番');
  }
  await page.locator('#rematch').click();
  await expect(page.locator('.status')).toContainText('1手', { timeout: 15000 });
  await expect(page.locator('.status')).toContainText('シアンの手番');
  await page.locator('#rematch').click();
  await expect(page.locator('.status')).toContainText('0手');
  await page.locator('.cell[aria-disabled="false"]').first().click();
  await page.locator('#confirm').click();
  await page.locator('#local').click();
  await page.waitForTimeout(2000);
  await expect(page.locator('.status')).toContainText('0手');
});
