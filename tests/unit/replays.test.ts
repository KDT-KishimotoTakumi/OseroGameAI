import { expect, it, vi } from 'vitest';
import { readReplays, writeReplay } from '../../src/infrastructure/replays';
it('履歴を20件に制限し破損データから復帰する', () => {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => data.set(k, v),
  });
  for (let i = 0; i < 25; i++)
    writeReplay({ id: String(i), date: '日時', result: '結果', snapshots: [{ turn: 1 }] });
  expect(readReplays()).toHaveLength(20);
  data.set('jiso.rpg.replays.v1', 'broken');
  expect(readReplays()).toEqual([]);
  vi.unstubAllGlobals();
});
