import { expect, test } from '@playwright/test';

// 初めての訪問を再現するため、ガイド表示済みの保存状態を使わない。
test.use({ storageState: { cookies: [], origins: [] } });

test('初回ガイドの表示・移動・対局停止・練習への導線と再表示', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('jiso.settings', JSON.stringify({ motion: true, sound: false })),
  );
  await page.goto('/');
  const dialog = page.locator('#guide-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('1 / 7');
  await expect(page.locator('.hp-bars')).toHaveClass(/guide-focus/);
  await expect(page.locator('#guide-prev')).toBeDisabled();
  await expect(page.locator('#guide-next')).toBeFocused();

  // ガイド表示中は手番案内を出さず、盤面操作も受け付けない。
  await page.waitForTimeout(2500);
  await expect(page.locator('#turn-notice')).toHaveCount(0);
  await expect(page.locator('#place-mode')).toBeDisabled();

  await page.locator('#guide-next').click();
  await expect(dialog).toContainText('2 / 7');
  await expect(page.locator('.board')).toHaveClass(/guide-focus/);
  await page.keyboard.press('ArrowLeft');
  await expect(dialog).toContainText('1 / 7');
  for (let step = 0; step < 6; step++) await page.keyboard.press('ArrowRight');
  await expect(dialog).toContainText('7 / 7');
  await expect(page.locator('#guide-next')).toHaveCount(0);

  await page.locator('#guide-practice').click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.tutorial-banner')).toContainText('1：石を置いて攻撃');
  expect(await page.evaluate(() => localStorage.getItem('jiso.onboarding.v1'))).toBe('done');

  // 表示済みなら再読み込みで出ず、ボタンからいつでも見直せる。
  await page.reload();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('#turn-notice')).toBeVisible();
  await page.locator('#guide').click();
  await expect(dialog).toContainText('1 / 7');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('#turn-notice')).toBeVisible();
  await expect(page.locator('#turn-notice')).toHaveCount(0, { timeout: 4000 });
  await expect(page.locator('#place-mode')).toBeEnabled();
});
