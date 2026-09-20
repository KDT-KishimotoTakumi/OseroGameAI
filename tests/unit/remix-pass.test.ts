import { expect, it } from 'vitest';
import { available, createRemixMatch, simulate } from '../../src/domain/remix-match';
import { chooseRemix } from '../../src/ai/remix-search';
it('置けない番は回転を禁止してパスだけを許可し、盤面とHPを保持する', () => {
  const match = createRemixMatch();
  match.board.fill(1);
  match.board[0] = 0;
  match.board[2] = 2;
  const before = structuredClone(match);
  expect(available(match)).toEqual([{ kind: 'pass' }]);
  expect(() => simulate(match, { kind: 'rotate', quadrant: 0, direction: 'right' })).toThrow();
  const result = simulate(match, { kind: 'pass' });
  expect(result.next.board).toEqual(match.board);
  expect(result.next.hp).toEqual(match.hp);
  expect(result.next.turn).toBe(2);
  expect(result.next.ply).toBe(1);
  expect(result.next.quiet).toBe(1);
  expect(result.next.winner).toBeNull();
  expect(result.waves).toEqual([]);
  expect(match).toEqual(before);
  expect(available(result.next)).toContainEqual({ kind: 'cell', index: 0 });
  for (const level of ['beginner', 'standard', 'advanced'] as const)
    expect(chooseRemix(match, level)).toEqual({ kind: 'pass' });
});
it('双方置けない・満盤はHP→石数→同点で終了し、無限パスしない', () => {
  for (const [hp1, hp2, fill, winner] of [
    [40, 30, 2, 1],
    [30, 40, 1, 2],
    [40, 40, 1, 1],
    [40, 40, 0, 0],
  ] as const) {
    const match = createRemixMatch();
    match.board.fill(fill);
    match.hp = { 1: hp1, 2: hp2 };
    const next = simulate(match, { kind: 'pass' }).next;
    expect(next.winner).toBe(winner);
    expect(next.endReason).toBe('blocked');
    expect(available(next)).toEqual([]);
  }
});
it('置ける番はパス不可、旧版の満盤回転は履歴再生用に維持', () => {
  expect(() => simulate(createRemixMatch(), { kind: 'pass' })).toThrow();
  const legacy = createRemixMatch(1, 1);
  legacy.board.fill(1);
  expect(available(legacy)).toHaveLength(8);
  expect(available(legacy).every((command) => command.kind === 'rotate')).toBe(true);
});
