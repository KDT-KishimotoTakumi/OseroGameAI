import { available, transition, type Match, type Command } from '../domain/match';
import { scores } from '../domain/rules';
import type { AiLevel } from './search';
function value(m: Match, player: 1 | 2): number {
  if (m.winner !== null) return m.winner === 0 ? 0 : m.winner === player ? 100000 : -100000;
  const other = player === 1 ? 2 : 1,
    s = scores(m.board);
  const base = (p: number) =>
    m.rpg.heroes
      .filter((h) => h.owner === p && !h.defeated)
      .reduce((n, h) => n + 20 + (h.shield ? 5 : 0), 0);
  const quest = (p: 1 | 2) => m.quests[p].reduce((n, q) => n + q.progress / q.goal, 0);
  return (
    (base(player) - base(other)) * (m.victory === 'base' ? 10 : 1) +
    (quest(player) - quest(other)) * (m.victory === 'quest' ? 150 : 5) +
    (s[player - 1] - s[other - 1]) * (m.victory === 'score' ? 5 : 1) +
    m.rpg.experience[player] -
    m.rpg.experience[other]
  );
}
export function chooseRpg(m: Match, level: AiLevel): Command {
  const actions = available(m);
  if (!actions.length) throw new Error('対局終了');
  if (level === 'beginner') return actions[(m.random >>> 0) % actions.length];
  const deadline = performance.now() + (level === 'advanced' ? 1800 : 800);
  let best = actions[0],
    score = -Infinity;
  for (const action of actions) {
    if (performance.now() > deadline) break;
    const next = transition(m, action);
    let v = value(next, m.turn);
    if (level === 'advanced' && next.winner === null) {
      for (const reply of available(next)) {
        if (performance.now() > deadline) break;
        v = Math.min(v, value(transition(next, reply), m.turn));
      }
    }
    if (v > score) {
      score = v;
      best = action;
    }
  }
  return best;
}
