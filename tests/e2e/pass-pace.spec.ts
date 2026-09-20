import { expect, test } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'jiso.settings',
      JSON.stringify({ motion: true, sound: false, music: false }),
    ),
  );
});
test('手番案内を中央に2秒表示し、途中の操作と旧タイマーを拒否', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.locator('#turn-notice')).toContainText('シアンの番です');
  await expect(page.locator('#place-mode')).toBeDisabled();
  await expect(page.locator('#turn-notice')).toHaveCount(0);
  await page.locator('#new').click();
  const started = Date.now();
  await page.waitForTimeout(1000);
  await expect(page.locator('#turn-notice')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('手番案内.png') });
  await expect(page.locator('#turn-notice')).toHaveCount(0);
  expect(Date.now() - started).toBeGreaterThanOrEqual(1850);
  await page.locator('.cell[aria-disabled="false"]').first().click();
  await page.locator('#confirm').click();
  await expect(page.locator('#turn-notice')).toContainText('オレンジの番です');
  await page.locator('#new').click();
  await expect(page.locator('#turn-notice')).toContainText('シアンの番です');
  await expect(page.locator('#turn-notice')).toHaveCount(0);
  await expect(page.locator('.status')).toContainText('0手');
});
test('片側着手不能を自動パスし、双方着手不能なら終了する', async ({ page }) => {
  // 配信する開始盤面だけを試験用に変更し、製品コードに局面注入APIを追加しない。
  await page.route('**/src/domain/remix-match.ts*', async (route) => {
    const response = await route.fetch();
    const source = (await response.text()).replace(
      'board: initialBoard()',
      'board: Array.from({length:64}, (_, i) => i === 0 ? 0 : i === 2 ? 2 : 1)',
    );
    await route.fulfill({ response, body: source });
  });
  await page.goto('/');
  await expect(page.locator('#turn-notice')).toContainText('パスします');
  await expect(page.locator('#rotate-mode')).toBeDisabled();
  await expect(page.locator('.status')).toContainText('1手');
  await expect(page.locator('#attack-status')).toContainText('パスしました');
  await expect(page.locator('#hp1')).toHaveText('50 / 50 HP');
  await expect(page.locator('#hp2')).toHaveText('50 / 50 HP');
  await page.locator('[data-index="0"]').click();
  await page.locator('#confirm').click();
  await expect(page.locator('#turn-notice')).toContainText('パスします');
  await expect(page.locator('#same')).toBeVisible();
  await expect(page.locator('.result-card')).toContainText('双方とも置けるマスがない');
  const status = await page.locator('.status').textContent();
  await page.waitForTimeout(2300);
  expect(await page.locator('.status').textContent()).toBe(status);
});
