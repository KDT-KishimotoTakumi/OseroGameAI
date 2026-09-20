import { expect, it } from 'vitest';
import { createRemixMatch, available, simulate, commit } from '../../src/domain/remix-match';

function empty() {
  const match = createRemixMatch();
  match.board.fill(0);
  return match;
}
it('着手の連続攻撃と区画外への回転攻撃でHPを減らす', () => {
  const match = empty();
  for (const i of [2, 17, 11]) match.board[i] = 1;
  for (const i of [1, 9, 10]) match.board[i] = 2;
  const result = simulate(match, { kind: 'cell', index: 0 });
  expect(result.damage).toBe(3);
  expect(result.next.hp[2]).toBe(47);
  expect(result.next.ply).toBe(1);
  expect(match.ply).toBe(0);
  const rotated = empty();
  rotated.board[0] = rotated.board[5] = 1;
  rotated.board[4] = 2;
  expect(simulate(rotated, { kind: 'rotate', quadrant: 0, direction: 'right' }).next.board[4]).toBe(
    1,
  );
});
it('通常の連続回転を拒否し、着手不能ならパスする', () => {
  const match = createRemixMatch();
  match.lastAction[1] = 'rotate';
  expect(available(match).some((c) => c.kind === 'rotate')).toBe(false);
  expect(() => simulate(match, { kind: 'rotate', quadrant: 0, direction: 'left' })).toThrow();
  match.board.fill(1);
  expect(available(match)).toEqual([{ kind: 'pass' }]);
});
it('HP0は無攻撃判定より優先し、ダメージ超過でも負のHPにしない', () => {
  const match = empty();
  match.board[1] = 2;
  match.board[2] = 1;
  match.hp[2] = 1;
  match.quiet = 9;
  const next = commit(match, { kind: 'cell', index: 0 }, 0).next;
  expect(next.hp[2]).toBe(0);
  expect(next.winner).toBe(1);
  expect(next.endReason).toBe('hp');
  expect(next.quiet).toBe(0);
  expect(available(next)).toEqual([]);
  expect(() => simulate(next, { kind: 'cell', index: 0 })).toThrow();
});
it('空区画も1手、無攻撃9から10でHP→石数→引き分け判定', () => {
  for (const [hp1, hp2, stone, winner] of [
    [40, 30, 0, 1],
    [30, 40, 0, 2],
    [40, 40, 1, 1],
    [40, 40, 0, 0],
  ] as const) {
    const match = empty();
    match.board[61] = 2;
    match.board[62] = 1;
    match.quiet = 9;
    match.hp = { 1: hp1, 2: hp2 };
    if (stone) match.board[63] = 1;
    const next = simulate(match, { kind: 'rotate', quadrant: 0, direction: 'right' }).next;
    expect(next.quiet).toBe(10);
    expect(next.winner).toBe(winner);
    expect(next.endReason).toBe('quiet');
  }
});
it('版違い・不正入力を拒否し、攻撃すると無攻撃回数をリセット', () => {
  const match = empty();
  match.board[1] = 2;
  match.board[2] = 1;
  match.quiet = 9;
  expect(() => commit(match, { kind: 'cell', index: 0 }, 1)).toThrow();
  expect(() => simulate(match, { kind: 'cell', index: 64 })).toThrow();
  expect(simulate(match, { kind: 'cell', index: 0 }).next.quiet).toBe(0);
});
