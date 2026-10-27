import { available, simulate } from '../domain/remix-match';
import { other, type Player, type RemixMatch, type RemixCommand } from '../domain/remix-types';
import type { AiLevel } from './search';
export type RemixAiLevel = AiLevel | 'super-hard';
export const difficultySettings = {
  standard: { label: 'ノーマル', depth: 1, budgetMs: 800 },
  advanced: { label: 'ハード', depth: 2, budgetMs: 1800 },
  'super-hard': { label: 'スーパーハード', depth: 4, budgetMs: 2500 },
} as const;
export interface SearchOptions {
  seed?: number;
  budgetMs?: number;
  now?: () => number;
}
function evaluate(match: RemixMatch, player: Player): number {
  if (match.winner !== null)
    return match.winner === 0 ? 0 : match.winner === player ? 100000 : -100000;
  return (
    (match.hp[player] - match.hp[other(player)]) * 100 +
    match.board.reduce<number>(
      (sum, cell) => sum + (cell === player ? 1 : cell === other(player) ? -1 : 0),
      0,
    )
  );
}
export function chooseRemix(
  match: RemixMatch,
  level: RemixAiLevel = 'standard',
  options: SearchOptions = {},
): RemixCommand {
  const moves = available(match);
  if (!moves.length) throw new Error('対局は終了しています');
  let random = (options.seed ?? match.version + 1) >>> 0;
  random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
  if (level === 'beginner') return moves[random % moves.length];
  const settings = difficultySettings[level];
  const now = options.now ?? (() => performance.now());
  const deadline = now() + (options.budgetMs ?? settings.budgetMs);
  const timeout = Symbol('探索時間終了');
  const search = (state: RemixMatch, depth: number, alpha: number, beta: number): number => {
    if (now() >= deadline) throw timeout;
    if (depth === 0 || state.winner !== null) return evaluate(state, match.turn);
    const maximize = state.turn === match.turn;
    let value = maximize ? -Infinity : Infinity;
    for (const command of available(state)) {
      const score = search(simulate(state, command).next, depth - 1, alpha, beta);
      value = maximize ? Math.max(value, score) : Math.min(value, score);
      if (maximize) alpha = Math.max(alpha, value);
      else beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return value;
  };
  let best = moves[0];
  // 全候補を比較し終えた深さの結果だけ採用し、時間切れの偏りを防ぐ。
  try {
    for (let depth = 1; depth <= settings.depth; depth++) {
      let candidate = best, bestValue = -Infinity;
      for (const command of [best, ...moves.filter((move) => move !== best)]) {
        const value = search(simulate(match, command).next, depth - 1, bestValue, Infinity);
        if (value > bestValue) {
          bestValue = value;
          candidate = command;
        }
      }
      best = candidate;
      if (bestValue === 100000) break;
    }
  } catch (error) {
    if (error !== timeout) throw error;
  }
  return best;
}
