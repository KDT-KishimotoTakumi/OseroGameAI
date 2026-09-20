import { expect, it, vi } from 'vitest';
import {
  readRemixReplays,
  saveRemixReplay,
  REPLAY_KEY,
  validReplay,
} from '../../src/infrastructure/remix-replays';
import { available, createRemixMatch, simulate } from '../../src/domain/remix-match';
import type { RemixFrame } from '../../src/infrastructure/remix-replays';
it('旧版の履歴とパスを含む新版の履歴を各ルールで検証する', () => {
  for (const ruleVersion of [1, 2] as const) {
    let match = createRemixMatch(1, ruleVersion);
    const frames: RemixFrame[] = [{ match }];
    for (let n = 0; n < 1000 && match.winner === null; n++) {
      const moves = available(match);
      const result = simulate(match, moves[ruleVersion === 2 ? (n * 13 + 5) % moves.length : 0]);
      match = result.next;
      frames.push({ match, command: result.command, waves: result.waves, damage: result.damage });
    }
    expect(match.winner).not.toBeNull();
    if (ruleVersion === 2)
      expect(frames.some((frame) => frame.command?.kind === 'pass')).toBe(true);
    expect(
      validReplay({
        id: '版検査',
        date: '日時',
        result: '終了',
        schemaVersion: 1,
        ruleVersion,
        mode: 'local',
        frames,
      }),
    ).toBe(true);
    expect(
      validReplay({
        id: '版不一致',
        date: '日時',
        result: '終了',
        schemaVersion: 1,
        ruleVersion: ruleVersion === 1 ? 2 : 1,
        mode: 'local',
        frames,
      }),
    ).toBe(false);
  }
});
it('旧履歴を保護し、20件に制限して破損データを除外する', () => {
  const data = new Map([['jiso.rpg.replays.v1', '以前の履歴']]);
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  });
  const initial = createRemixMatch(),
    end = simulate(initial, { kind: 'rotate', quadrant: 0, direction: 'right' });
  for (let count = 0; count < 25; count++)
    saveRemixReplay({
      id: String(count),
      date: '日時',
      result: '結果',
      schemaVersion: 1,
      ruleVersion: 2,
      mode: 'local',
      frames: [
        { match: initial },
        { match: end.next, command: end.command, waves: end.waves, damage: end.damage },
      ],
    });
  expect(readRemixReplays()).toHaveLength(20);
  expect(data.get('jiso.rpg.replays.v1')).toBe('以前の履歴');
  const records = JSON.parse(data.get(REPLAY_KEY)!);
  records[0].frames[1].match.hp[1] = -1;
  records[1].schemaVersion = 8;
  data.set(REPLAY_KEY, JSON.stringify(records));
  expect(readRemixReplays()).toHaveLength(18);
  data.set(REPLAY_KEY, '破損');
  expect(readRemixReplays()).toEqual([]);
  vi.unstubAllGlobals();
});
it('保存拒否を呼出側へ通知する', () => {
  vi.stubGlobal('localStorage', {
    getItem: () => null,
    setItem: () => {
      throw new Error('容量不足');
    },
  });
  expect(() =>
    saveRemixReplay({
      id: '1',
      date: '日時',
      result: '結果',
      schemaVersion: 1,
      ruleVersion: 2,
      mode: 'local',
      frames: [{ match: createRemixMatch() }],
    }),
  ).toThrow();
  vi.unstubAllGlobals();
});
