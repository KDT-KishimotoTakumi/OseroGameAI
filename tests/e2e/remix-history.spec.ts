import { expect, test } from '@playwright/test';
import { createRemixMatch, simulate, available } from '../../src/domain/remix-match';
import type { RemixFrame } from '../../src/infrastructure/remix-replays';
test('履歴の全手復元と旧キー分離', async ({ page }) => {
  let match = createRemixMatch();
  const frames: RemixFrame[] = [{ match }];
  while (match.winner === null && frames.length < 1000) {
    const result = simulate(match, available(match)[0]);
    match = result.next;
    frames.push({ match, command: result.command, waves: result.waves, damage: result.damage });
  }
  expect(match.winner).not.toBeNull();
  const record = {
    id: '検証',
    date: '2026-09-19',
    result: '検証対局',
    schemaVersion: 1,
    ruleVersion: 2,
    mode: 'local',
    frames,
  };
  await page.addInitScript(
    ({ record }) => {
      localStorage.setItem('jiso.remix.replays.v1', JSON.stringify([record]));
      localStorage.setItem('jiso.replays', '旧履歴');
    },
    { record },
  );
  await page.goto('/');
  await page.getByText('対局履歴・全手再生', { exact: true }).click();
  await page.locator('#history button').click();
  for (let i = 0; i < frames.length; i++) {
    await expect(page.locator('#hp1')).toHaveText(`${frames[i].match.hp[1]} / 50 HP`);
    await expect(page.locator('#hp2')).toHaveText(`${frames[i].match.hp[2]} / 50 HP`);
    const board = await page
      .locator('.cell')
      .evaluateAll((nodes) =>
        nodes.map((node) =>
          node.classList.contains('stone-cyan')
            ? 1
            : node.classList.contains('stone-orange')
              ? 2
              : 0,
        ),
      );
    expect(board).toEqual(frames[i].match.board);
    if (i < frames.length - 1) await page.locator('#rnext').click();
  }
  await page.reload();
  await expect(page.locator('#history button')).toHaveCount(1);
  expect(await page.evaluate(() => localStorage.getItem('jiso.replays'))).toBe('旧履歴');
});
