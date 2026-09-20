import { performance } from 'node:perf_hooks';
import { createRemixMatch, simulate, available, sameCommand } from '../src/domain/remix-match';
import { chooseRemix } from '../src/ai/remix-search';
import type { AiLevel } from '../src/ai/search';
let maximum = 0,
  turns = 0,
  longest = 0;
const wins = [0, 0, 0],
  levels: AiLevel[] = ['beginner', 'standard', 'advanced'];
for (let game = 0; game < 12; game++) {
  let match = createRemixMatch(game % 2 === 0 ? 1 : 2);
  while (match.winner === null) {
    if (match.ply >= 1000) throw new Error('終局保証の上限を超過');
    const start = performance.now(),
      level = levels[(game + match.turn - 1) % 3];
    const command = chooseRemix(match, level, { seed: game * 1000 + match.ply + 1, budgetMs: 100 });
    maximum = Math.max(maximum, performance.now() - start);
    if (!available(match).some((candidate) => sameCommand(candidate, command)))
      throw new Error('AIが不正操作を選択');
    match = simulate(match, command).next;
    turns++;
  }
  longest = Math.max(longest, match.ply);
  wins[match.winner]++;
}
console.log(
  JSON.stringify({
    対局数: 12,
    行動数: turns,
    最長手数: longest,
    引分と各色勝利数: wins,
    最大思考ミリ秒: maximum,
    試験探索上限ミリ秒: 100,
  }),
);
