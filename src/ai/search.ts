import { applyPlace, legalMoves, scores } from '../domain/rules';
import type { Board } from '../domain/types';

export type AiLevel = 'beginner' | 'standard' | 'advanced';

export function chooseMove(board: Board, player: 1 | 2, level: AiLevel = 'standard'): number | null {
  const moves = legalMoves(board, player);
  if (!moves.length) return null;
  if (level === 'beginner') return moves[Math.floor(Math.random() * moves.length)];
  const ranked = moves.map((index) => {
    const next = applyPlace(board, index, player);
    const [a, b] = scores(next);
    const corners = [0, 7, 56, 63].includes(index) ? 100 : 0;
    return { index, value: (player === 1 ? a - b : b - a) + corners };
  }).sort((x, y) => y.value - x.value);
  return level === 'advanced' ? ranked[0].index : ranked[Math.min(1, ranked.length - 1)].index;
}
