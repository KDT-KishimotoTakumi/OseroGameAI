import { expect, it } from 'vitest';
import { resolveCapture } from '../../src/domain/remix-capture';
import type { Board } from '../../src/domain/types';

it('新しく反転した石から3段階で攻撃し、入力を変更しない', () => {
  const board: Board = Array(64).fill(0);
  for (const i of [0, 2, 17, 11]) board[i] = 1;
  for (const i of [1, 9, 10]) board[i] = 2;
  const result = resolveCapture(board, 1, [0]);
  expect(result.waves).toEqual([[1], [9], [10]]);
  expect(result.damage).toBe(3);
  expect(board[1]).toBe(2);
});
it('複数方向で同じ石が対象になっても一度しか反転しない', () => {
  const board: Board = Array(64).fill(0);
  for (const i of [0, 2, 16, 18]) board[i] = 1;
  for (const i of [1, 8, 9]) board[i] = 2;
  const result = resolveCapture(board, 1, [0, 2, 16, 18]);
  expect(result.waves[0].sort((a, b) => a - b)).toEqual([1, 8, 9]);
  expect(new Set(result.waves.flat()).size).toBe(result.damage);
  expect(result.damage).toBeLessThanOrEqual(3);
});
