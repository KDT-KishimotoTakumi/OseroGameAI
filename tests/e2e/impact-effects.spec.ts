import { expect, test, type Page } from '@playwright/test';

const open = async (page: Page, settings: Record<string, unknown>) => {
  await page.addInitScript((value) => {
    if (!localStorage.getItem('jiso.settings'))
      localStorage.setItem('jiso.settings', JSON.stringify(value));
  }, settings);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
};
const attack = async (page: Page) => {
  await page.locator('.cell[aria-disabled="false"]').first().click();
  await page.locator('#confirm').click();
};
const sizes = (page: Page) =>
  page.locator('.cell').evaluateAll((nodes) =>
    nodes.map((node) => {
      const r = node.getBoundingClientRect();
      return [r.width, r.height];
    }),
  );

test('迫力：初期値は中、衝撃波と揺れを表示し、マス寸法と進行時間を変えない', async ({ page }) => {
  await open(page, { sound: false, music: false, motion: false, duration: 'long' });
  await page.getByText('演出設定', { exact: true }).click();
  await expect(page.locator('#impact')).toHaveValue('medium');
  await expect(page.locator('#impact option')).toHaveText(['強', '中', 'なし']);
  const before = await sizes(page);
  await attack(page);
  await expect(page.locator('#impact-layer .impact-wave').first()).toBeAttached();
  await expect
    .poll(() => page.locator('#app').evaluate((node) => node.getAnimations().length))
    .toBeGreaterThan(0);
  expect(await sizes(page)).toEqual(before);
  // 追加演出は既存の演出時間内に終わり、手番は通常どおり進む。
  await expect(page.locator('.status')).toContainText('1手');
  await expect(page.locator('#impact-layer > *')).toHaveCount(0);
  expect(await page.locator('#app').evaluate((node) => getComputedStyle(node).left)).toBe('0px');
});

test('迫力：強の保存、なしでは追加演出なし、新しい対局で中断', async ({ page }) => {
  await open(page, { sound: false, music: false, motion: false, duration: 'long' });
  await page.getByText('演出設定', { exact: true }).click();
  await page.locator('#impact').selectOption('strong');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('jiso.settings')!).impact)).toBe(
    'strong',
  );
  await page.reload();
  await page.getByText('演出設定', { exact: true }).click();
  await expect(page.locator('#impact')).toHaveValue('strong');
  await page.waitForTimeout(2200);
  await attack(page);
  await expect(page.locator('#impact-layer .impact-wave').first()).toBeAttached();
  await page.locator('#new').click();
  await expect(page.locator('#impact-layer > *')).toHaveCount(0);

  await page.locator('#impact').selectOption('off');
  await page.waitForTimeout(2200);
  await attack(page);
  await expect(page.locator('.flip-ring').first()).toBeAttached();
  await expect(page.locator('#impact-layer > *')).toHaveCount(0);
});

test('演出軽減中は迫力が強でも追加演出を出さない', async ({ page }) => {
  await open(page, { sound: false, music: false, motion: true, impact: 'strong' });
  await page.waitForTimeout(2200);
  await attack(page);
  await expect(page.locator('.status')).toContainText('1手');
  await expect(page.locator('#impact-layer > *')).toHaveCount(0);
  expect(await page.locator('#app').evaluate((node) => node.getAnimations().length)).toBe(0);
});
