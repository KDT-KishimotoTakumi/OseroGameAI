import type { Board, Cell } from './types';
const directions = [-1, 0, 1].flatMap((r) => [-1, 0, 1].map((c) => [r, c] as const)).filter(([r, c]) => r !== 0 || c !== 0);
const inside = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;
export function flips(board: Board, index: number, player: 1 | 2): number[] {
  if (!Number.isInteger(index) || index < 0 || index >= 64 || board[index] !== 0) return [];
  const other: Cell = player === 1 ? 2 : 1; const row = Math.floor(index / 8); const col = index % 8; const result: number[] = [];
  for (const [dr, dc] of directions) { const line: number[] = []; let r = row + dr; let c = col + dc;
    while (inside(r, c) && board[r * 8 + c] === other) { line.push(r * 8 + c); r += dr; c += dc; }
    if (line.length && inside(r, c) && board[r * 8 + c] === player) result.push(...line);
  } return result;
}
export function legalMoves(board: Board, player: 1 | 2): number[] { return board.flatMap((v, i) => v === 0 && flips(board, i, player).length ? [i] : []); }
export function scores(board: Board): [number, number] { return [board.filter((v) => v === 1).length, board.filter((v) => v === 2).length]; }
export function applyPlace(board: Board, index: number, player: 1 | 2): Board { const changed = flips(board, index, player); if (!changed.length) throw new Error('そのマスには置けません'); const next = [...board] as Board; next[index] = player; for (const i of changed) next[i] = player; return next; }
