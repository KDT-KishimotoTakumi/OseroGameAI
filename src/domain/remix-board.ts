import type { Board } from './types';
import type { Direction, Quadrant } from './remix-types';
export function initialBoard(): Board {
  const board: Board = Array(64).fill(0);
  for (const index of [3, 9, 21, 28, 35, 42, 54, 60]) board[index] = 1;
  for (const index of [4, 14, 18, 27, 36, 45, 49, 59]) board[index] = 2;
  return board;
}
export function quadrantOf(index: number): Quadrant {
  return ((Math.floor(index / 8) >= 4 ? 2 : 0) + (index % 8 >= 4 ? 1 : 0)) as Quadrant;
}
export function quadrantCells(quadrant: Quadrant): number[] {
  if (!Number.isInteger(quadrant) || quadrant < 0 || quadrant > 3)
    throw new Error('区画を選んでください');
  const row = quadrant >= 2 ? 4 : 0,
    col = quadrant % 2 ? 4 : 0;
  return Array.from(
    { length: 16 },
    (_, index) => (row + Math.floor(index / 4)) * 8 + col + (index % 4),
  );
}
export function rotateQuadrant(board: Board, quadrant: Quadrant, direction: Direction): Board {
  if (direction !== 'right' && direction !== 'left') throw new Error('回す向きが不正です');
  const cells = quadrantCells(quadrant),
    next = [...board];
  cells.forEach((index, local) => {
    const row = Math.floor(local / 4),
      col = local % 4;
    const target = direction === 'right' ? col * 4 + 3 - row : (3 - col) * 4 + row;
    next[cells[target]] = board[index];
  });
  return next;
}
