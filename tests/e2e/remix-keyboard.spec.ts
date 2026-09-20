import { expect, test } from '@playwright/test';
test('キーボードで着手・回転・取消・確定', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('jiso.settings', JSON.stringify({ motion: true, sound: false })),
  );
  await page.goto('/');
  await page.locator('.cell[aria-disabled="false"]').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#confirm')).toBeEnabled();
  await expect(page.locator('.status')).toContainText('0手');
  await page.locator('[data-index="0"]').focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('#confirm')).toBeDisabled();
  await page.locator('#rotate-mode').focus();
  await page.keyboard.press('Space');
  await page.locator('[data-quarter="0"]').focus();
  await page.keyboard.press('Enter');
  await page.locator('#left').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#left')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-index="0"]').focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('#confirm')).toBeDisabled();
  await page.locator('[data-quarter="0"]').focus();
  await page.keyboard.press('Enter');
  await page.locator('#confirm').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.status')).toContainText('1手');
  await expect(page.locator('.status')).toContainText('オレンジの手番');
});
