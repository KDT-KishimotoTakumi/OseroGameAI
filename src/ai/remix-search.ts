import { available, simulate } from '../domain/remix-match';
import { other, type Player, type RemixMatch, type RemixCommand } from '../domain/remix-types';
import type { AiLevel } from './search';
export type RemixAiLevel = AiLevel | 'super-hard';
/**
 * threatWeight：探索の末端で、次に手番を持つ側の最大攻撃ダメージを評価に見込む重み。
 * 偶数手で読みを打ち切ると相手の反撃だけを数えて守りに偏るため、ハード以上で使う。
 * 0.5 は対「最大ダメージだけを狙う相手」の自己対戦で最も勝率が高かった値（docs/VALIDATION.md）。
 */
export const difficultySettings = {
  standard: { label: 'ノーマル', depth: 1, budgetMs: 800, threatWeight: 0 },
  advanced: { label: 'ハード', depth: 2, budgetMs: 1800, threatWeight: 0.5 },
  'super-hard': { label: 'スーパーハード', depth: 4, budgetMs: 2500, threatWeight: 0.5 },
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
  const evaluateLeaf = (state: RemixMatch): number => {
    const base = evaluate(state, match.turn);
    if (!settings.threatWeight || state.winner !== null) return base;
    let threat = 0;
    for (const command of available(state)) {
      if (now() >= deadline) throw timeout;
      threat = Math.max(threat, simulate(state, command).damage);
    }
    const sign = state.turn === match.turn ? 1 : -1;
    return base + Math.round(sign * threat * 100 * settings.threatWeight);
  };
  const search = (state: RemixMatch, depth: number, alpha: number, beta: number): number => {
    if (now() >= deadline) throw timeout;
    if (depth === 0 || state.winner !== null) return evaluateLeaf(state);
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
  // 評価が最善と同点の手はシードで選び、強さを保ったまま毎回同じ展開になるのを防ぐ。
  // 評価値は整数なので、窓を (最善-1, ∞) にすると同点手の値も正確に求まる。
  try {
    for (let depth = 1; depth <= settings.depth; depth++) {
      let bestValue = -Infinity,
        ties: RemixCommand[] = [];
      for (const command of [best, ...moves.filter((move) => move !== best)]) {
        const value = search(simulate(match, command).next, depth - 1, bestValue - 1, Infinity);
        if (value > bestValue) {
          bestValue = value;
          ties = [command];
        } else if (value === bestValue) ties.push(command);
      }
      best = ties[random % ties.length];
      if (bestValue === 100000) break;
    }
  } catch (error) {
    if (error !== timeout) throw error;
  }
  return best;
}
