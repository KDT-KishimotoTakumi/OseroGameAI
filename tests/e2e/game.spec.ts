import { expect, test } from '@playwright/test';
test.beforeEach(async({page})=>{await page.addInitScript(()=>localStorage.setItem('jiso.settings',JSON.stringify({motion:true,sound:false})));});
test('4拠点、英雄選択、対局、リプレイ', async ({ page }) => {
  test.setTimeout(120000);
  await page.goto('/');
  await expect(page.locator('.portrait')).toHaveCount(4);
  await page.locator('summary').filter({ hasText: '開始設定' }).click();
  await page.locator('#hero0').selectOption('2');
  await page.locator('#stage').selectOption('1');
  for (let n = 0; n < 130; n++) {
    if (await page.locator('#same').count()) break;
    const target = page.locator('.cell[aria-disabled="false"]').first();
    if (await target.count()) await target.click();
    else await page.locator('#pass').click();
  }
  await expect(page.locator('#same')).toBeVisible();
  await page.getByText('対局履歴・全手再生', { exact: true }).click();
  await page.locator('#history button').first().click();
  await expect(page.locator('#rnext')).toBeVisible();
  await page.locator('#rnext').click();
  await page.locator('#restart').click();
  await expect(page.locator('.status')).toContainText('0/120');
});
test('5段階の説明とAI Worker', async ({ page }) => {
  await page.goto('/');
  await page.locator('#tutorial').click();
  for (let i = 0; i < 5; i++) await page.locator('#next').click();
  await page.locator('#ai').click();
  if ((await page.locator('.status').textContent())?.includes('シアンの手番'))
    await page.locator('.cell[aria-disabled="false"]').first().click();
  await expect(page.locator('.status')).toContainText('シアンの手番', { timeout: 10000 });
});
test('キーボード・設定・画面と描画間隔', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.locator('[data-index="0"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-index="1"]')).toBeFocused();
  await page.getByText('演出設定', { exact: true }).click();
  await page.locator('#motion').check();
  await expect(page.locator('html')).toHaveClass(/reduced-motion/);
  await page.screenshot({ path: testInfo.outputPath('盤面.png'), fullPage: true });
  const fps = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let count = 0;
        const start = performance.now();
        function frame() {
          count++;
          if (performance.now() - start >= 1000)
            resolve((count * 1000) / (performance.now() - start));
          else requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      }),
  );
  await testInfo.attach('描画計測', {
    body: JSON.stringify({ fps }),
    contentType: 'application/json',
  });
  expect(fps).toBeGreaterThanOrEqual(30);
});
