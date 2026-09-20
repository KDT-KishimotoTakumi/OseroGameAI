import { expect, test } from '@playwright/test';
test('予告取消、キーボード、演出途中の再開始、設定保持', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('jiso.settings'))
      localStorage.setItem(
        'jiso.settings',
        JSON.stringify({ motion: false, sound: false, duration: 'long' }),
      );
  });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.locator('.cell[aria-disabled="false"]').first().click();
  await expect(page.locator('.status')).toContainText('0手');
  await page.locator('[data-index="0"]').focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('#confirm')).toBeDisabled();
  await page.locator('[data-index="0"]').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-index="1"]')).toBeFocused();
  await page.locator('#rotate-mode').click();
  await page.locator('[data-quarter="0"]').click();
  await page.locator('#confirm').click();
  await page.locator('#new').click();
  await expect(page.locator('.status')).toContainText('0手');
  await expect(page.locator('.stone')).toHaveCount(16);
  await expect(page.locator('.animation-stone')).toHaveCount(0);
  await page.getByText('演出設定', { exact: true }).click();
  await page.locator('#motion').check();
  await expect(page.locator('html')).toHaveClass(/reduced-motion/);
  await page.screenshot({ path: testInfo.outputPath('盤面.png'), fullPage: true });
  await expect(page.locator('#turn-notice')).toHaveCount(0);
  const timing = await page.evaluate(
    () =>
      new Promise<{ fps: number; previewMs: number }>((resolve) => {
        const button = document.querySelector<HTMLButtonElement>('.cell[aria-disabled="false"]')!;
        const previewStart = performance.now();
        button.click();
        const previewMs = performance.now() - previewStart;
        let count = 0;
        const start = performance.now();
        function frame() {
          count++;
          const elapsed = performance.now() - start;
          if (elapsed >= 1000) resolve({ fps: (count * 1000) / elapsed, previewMs });
          else requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      }),
  );
  await testInfo.attach('描画と予告応答', {
    body: JSON.stringify(timing),
    contentType: 'application/json',
  });
  expect(timing.fps).toBeGreaterThanOrEqual(30);
  expect(timing.previewMs).toBeLessThan(100);
  await page.reload();
  await page.getByText('演出設定', { exact: true }).click();
  await expect(page.locator('#motion')).toBeChecked();
});
