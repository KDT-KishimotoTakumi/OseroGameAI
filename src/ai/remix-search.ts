import { available, simulate } from '../domain/remix-match';
import { other, type Player, type RemixMatch, type RemixCommand } from '../domain/remix-types';
import type { AiLevel } from './search';
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
  level: AiLevel = 'standard',
  options: SearchOptions = {},
): RemixCommand {
  const moves = available(match);
  if (!moves.length) throw new Error('対局は終了しています');
  let random = (options.seed ?? match.version + 1) >>> 0;
  random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
  if (level === 'beginner') return moves[random % moves.length];
  const now = options.now ?? (() => performance.now()),
    deadline = now() + (options.budgetMs ?? (level === 'advanced' ? 1800 : 800));
  let best = moves[0],
    bestValue = -Infinity;
  for (const command of moves) {
    if (now() >= deadline) break;
    const next = simulate(match, command).next;
    let value = evaluate(next, match.turn);
    if (level === 'advanced' && next.winner === null) {
      let worst = Infinity;
      for (const response of available(next)) {
        if (now() >= deadline) break;
        worst = Math.min(worst, evaluate(simulate(next, response).next, match.turn));
      }
      if (worst !== Infinity) value = worst;
    }
    if (value > bestValue) {
      bestValue = value;
      best = command;
    }
  }
  return best;
}
