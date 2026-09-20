import { expect, test } from '@playwright/test';
test('5練習、やり直し、対局と履歴の保護', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'jiso.settings',
      JSON.stringify({ motion: false, sound: false, duration: 'short' }),
    ),
  );
  await page.goto('/');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('#tutorial').click();
  await expect(page.locator('#next')).toBeDisabled();
  await page.locator('#rotate-mode').click();
  await page.locator('[data-quarter="0"]').click();
  await page.locator('#confirm').click();
  await expect(page.locator('[role="status"]')).toContainText('練習の説明');
  await expect(page.locator('.status')).toContainText('0手');
  await page.locator('#retry').click();
  for (let i = 0; i < 5; i++) {
    if (i === 1 || i === 2) {
      await page.locator('#rotate-mode').click();
      await page.locator('[data-quarter="0"]').click();
      if (i === 2) {
        await page.locator('#left').click();
        await page.locator('#cancel').click();
        await page.locator('[data-quarter="0"]').click();
      }
    } else await page.locator('[data-index="0"]').click();
    if (i === 3) {
      await expect(page.locator('#preview')).toContainText('3連鎖');
      await page.evaluate(() => {
        const labels: string[] = [];
        Object.assign(window, { chainLabels: labels });
        const observer = new MutationObserver(() => {
          const text = document.querySelector('#attack-status')?.textContent ?? '';
          if (!labels.includes(text)) labels.push(text);
        });
        observer.observe(document.querySelector('#app')!, { childList: true, subtree: true });
      });
    }
    await page.locator('#confirm').click();
    if (i === 3) {
      await expect(page.locator('#attack-status')).toContainText('3連鎖・3ダメージ');
      await expect(page.locator('#hp2')).toContainText('47');
    }
    await expect(page.locator('#practice-progress')).toContainText('練習成功');
    if (i === 3) {
      const labels = await page.evaluate(
        () => (window as unknown as { chainLabels: string[] }).chainLabels,
      );
      expect(labels).toEqual(
        expect.arrayContaining(['1連鎖・1ダメージ', '2連鎖・2ダメージ', '3連鎖・3ダメージ']),
      );
    }
    await page.locator('#next').click();
  }
  await expect(page.locator('#practice-progress')).toHaveCount(0);
  await expect(page.locator('.status')).toContainText('0手');
  await expect(page.locator('.stone')).toHaveCount(16);
  await expect(page.locator('#history button')).toHaveCount(0);
});
