import { expect, test } from '@playwright/test';
test('敵襲なし・反転動画・マス寸法が一定', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'jiso.settings',
      JSON.stringify({ motion: false, sound: false, duration: 'long' }),
    ),
  );
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(page.locator('.raid-counter')).toHaveCount(0);
  const cells = page.locator('.cell');
  const before = await cells.evaluateAll((nodes) =>
    nodes.map((n) => {
      const r = n.getBoundingClientRect();
      return [r.width, r.height];
    }),
  );
  expect(Math.max(...before.map((x) => x[1])) - Math.min(...before.map((x) => x[1]))).toBeLessThan(
    1,
  );
  await page
    .locator('.cell[aria-disabled="false"]:not(.hero-cyan):not(.hero-orange)')
    .first()
    .click();
  await page.locator('#confirm').click();
  await expect
    .poll(() =>
      page
        .locator('.stone')
        .evaluateAll((nodes) => nodes.reduce((sum, node) => sum + node.getAnimations().length, 0)),
    )
    .toBeGreaterThan(0);
  await expect
    .poll(() =>
      page
        .locator('.stone')
        .evaluateAll((nodes) => nodes.reduce((sum, node) => sum + node.getAnimations().length, 0)),
    )
    .toBe(0);
  const after = await cells.evaluateAll((nodes) =>
    nodes.map((n) => {
      const r = n.getBoundingClientRect();
      return [r.width, r.height];
    }),
  );
  after.forEach((size, i) => {
    expect(Math.abs(size[0] - before[i][0])).toBeLessThan(1);
    expect(Math.abs(size[1] - before[i][1])).toBeLessThan(1);
  });
  await expect(page.locator('.enemy')).toHaveCount(0);
});
