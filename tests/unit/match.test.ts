import { expect, it } from 'vitest';
import { available, createMatch, transition } from '../../src/domain/match';
import { chooseRpg } from '../../src/ai/rpg-search';
it('4拠点と初期化の再現性', () => {
  expect(createMatch(20)).toEqual(createMatch(20));
  expect(createMatch(20).rpg.heroes).toHaveLength(4);
});
it('自分の拠点へ攻撃できず元状態を変更しない', () => {
  const m = createMatch(20);
  expect(() => transition(m, { kind: 'cell', index: 0 })).toThrow();
  expect(m.ply).toBe(0);
});
it('相手の2拠点撃破まで勝利しない', () => {
  let m = createMatch(20);
  m.victory = 'base';
  for (const index of [63, 63, 56, 56]) {
    m.turn = 1;
    m = transition(m, { kind: 'cell', index });
    if (index === 63) expect(m.winner).toBeNull();
  }
  expect(m.winner).toBe(1);
  expect(() => transition(m, { kind: 'pass' })).toThrow();
});
it('クエストの報酬と進捗は各色独立', () => {
  let m = createMatch(20);
  m.quests[1] = [{ id: 'corner', text: '拠点攻撃', goal: 1, progress: 0, reward: 4 }];
  m = transition(m, { kind: 'cell', index: 63 });
  expect(m.rpg.experience[1]).toBe(4);
  expect(m.quests[2].every((q) => q.progress === 0)).toBe(true);
  m.turn = 1;
  m = transition(m, { kind: 'cell', index: 63 });
  expect(m.rpg.experience[1]).toBe(4);
});
it('120手で終了しAIは有効行動だけを返す', () => {
  let m = createMatch(20);
  m.ply = 119;
  const action = chooseRpg(m, 'standard');
  expect(available(m)).toContainEqual(action);
  m = transition(m, action);
  expect(m.winner).not.toBeNull();
});
it('敵襲を含めて同じ行動列を再現できる', () => {
  let a = createMatch(2),
    b = createMatch(2);
  a.victory = b.victory = 'score';
  for (let i = 0; i < 10 && a.winner === null; i++) {
    const action = available(a).find((c) => c.kind === 'cell' && c.index > 7 && c.index < 56)!;
    a = transition(a, action);
    b = transition(b, action);
  }
  expect(a).toEqual(b);
});
