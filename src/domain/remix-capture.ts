import type { Board } from './types';
import type { Player } from './remix-types';

const directions = [-1, 0, 1]
  .flatMap((row) => [-1, 0, 1].map((col) => [row, col]))
  .filter(([row, col]) => row !== 0 || col !== 0);
function targets(board: Board, origin: number, player: Player): number[] {
  if (board[origin] !== player) return [];
  const result: number[] = [];
  for (const [dr, dc] of directions) {
    let row = Math.floor(origin / 8) + dr,
      col = (origin % 8) + dc;
    const line: number[] = [];
    while (row >= 0 && row < 8 && col >= 0 && col < 8 && board[row * 8 + col] === 3 - player) {
      line.push(row * 8 + col);
      row += dr;
      col += dc;
    }
    if (
      line.length &&
      row >= 0 &&
      row < 8 &&
      col >= 0 &&
      col < 8 &&
      board[row * 8 + col] === player
    )
      result.push(...line);
  }
  return result;
}
export function resolveCapture(input: Board, player: Player, initialOrigins: number[]) {
  const board = [...input];
  const waves: number[][] = [];
  let origins = initialOrigins;
  // 各段階は同じ反転前盤面から判定し、走査順による結果の差をなくす。
  while (origins.length) {
    const wave = [...new Set(origins.flatMap((origin) => targets(board, origin, player)))].sort(
      (a, b) => a - b,
    );
    if (!wave.length) break;
    waves.push(wave);
    wave.forEach((index) => {
      board[index] = player;
    });
    origins = wave;
  }
  return { board, waves, damage: waves.reduce((count, wave) => count + wave.length, 0) };
}
