import { expect, test } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('jiso.settings', JSON.stringify({ motion: true, sound: false })),
  );
});
test('16石、左右回転、2人対局の終局と再生', async ({ page }) => {
  test.setTimeout(180000);
  await page.goto('/');
  await expect(page.locator('.stone')).toHaveCount(16);
  await expect(page.locator('.legal-dot')).toHaveCount(8);
  await expect(page.locator('#hero0,#skill,#stage,.terrain-mark,.portrait')).toHaveCount(0);
  await page.locator('#rotate-mode').click();
  await page.locator('[data-quarter="0"]').click();
  await page.locator('#left').click();
  await expect(page.locator('#left')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#cancel').click();
  await expect(page.locator('.status')).toContainText('0手');
  for (let n = 0; n < 1000; n++) {
    await expect
      .poll(
        async () =>
          (await page.locator('#same').count()) +
          (await page.locator('#place-mode:not([disabled])').count()),
      )
      .toBeGreaterThan(0);
    if (await page.locator('#same').count()) break;
    await page.locator('#place-mode').click();
    const target = page.locator('.cell[aria-disabled="false"]').first();
    await target.click();
    await page.locator('#confirm').click();
  }
  await expect(page.locator('#same')).toBeVisible();
  // 終局時は勝敗を大きく表示する。文言は手番表示の勝敗と同じ。
  const result = (await page.locator('.status strong').textContent())!;
  expect(result).toMatch(/^(シアンの勝利|オレンジの勝利|引き分け)$/);
  await expect(page.locator('#victory-banner')).toHaveText(result);
  const banner = await page.locator('#victory-banner').evaluate((node) => {
    const style = getComputedStyle(node);
    return { size: parseFloat(style.fontSize) };
  });
  expect(banner.size).toBeGreaterThanOrEqual(48);
  await page.getByText('対局履歴・全手再生', { exact: true }).click();
  await page.locator('#history button').first().click();
  await expect(page.locator('#victory-banner')).toHaveCount(0);
  await expect(page.locator('.stone')).toHaveCount(16);
  await page.locator('#rnext').click();
  await expect(page.locator('.status')).toContainText('1手');
  await page.locator('#restart').click();
  await expect(page.locator('.status')).toContainText('オレンジの手番');
});
