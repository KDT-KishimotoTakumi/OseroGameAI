import { applyPlace, flips, legalMoves, scores } from './rules';
import { opening } from './openings';
import { HEROES } from './heroes';
import { activateHeroSkill } from './hero-skills';
import {
  createRpg,
  attackHero,
  awardExperience,
  connectedParty,
  isVictory,
  type RpgState,
} from './rpg';
import { randomQuests, progressQuest, completedQuests, type Quest } from './quests';
import { randomVictory, type VictoryRule } from './victory';
import { STAGES } from './campaign';
import type { Board } from './types';
export type Command = { kind: 'cell'; index: number } | { kind: 'skill' } | { kind: 'pass' };
export interface Match {
  board: Board;
  turn: 1 | 2;
  rpg: RpgState;
  quests: Record<1 | 2, Quest[]>;
  heroes: [number, number];
  stage: number;
  seed: number;
  random: number;
  ply: number;
  victory: VictoryRule;
  winner: 0 | 1 | 2 | null;
  log: string[];
}
export function createMatch(seed: number, stage = 0, heroes: [number, number] = [0, 1]): Match {
  const rpg = createRpg();
  rpg.heroes = [
    { owner: 1, index: 0, shield: true, defeated: false },
    { owner: 2, index: 63, shield: true, defeated: false },
    { owner: 1, index: 7, shield: true, defeated: false },
    { owner: 2, index: 56, shield: true, defeated: false },
  ];
  return {
    board: opening(seed),
    turn: seed % 2 === 0 ? 1 : 2,
    rpg,
    quests: { 1: randomQuests(seed + 5), 2: randomQuests(seed + 5) },
    heroes,
    stage,
    seed,
    random: seed >>> 0,
    ply: 0,
    victory: randomVictory(seed + 13),
    winner: null,
    log: ['対局開始'],
  };
}
export function party(match: Match, owner: 1 | 2): number[] {
  const found = new Set<number>();
  for (const hero of match.rpg.heroes.filter((h) => h.owner === owner && !h.defeated)) {
    const board = [...match.board];
    board[hero.index] = owner;
    for (const index of connectedParty(board, hero)) if (index !== hero.index) found.add(index);
  }
  return [...found];
}
export function available(match: Match): Command[] {
  if (match.winner !== null) return [];
  const cells = new Set(
    legalMoves(match.board, match.turn).filter((i) => !match.rpg.heroes.some((h) => h.index === i)),
  );
  match.rpg.heroes
    .filter((h) => h.owner !== match.turn && !h.defeated)
    .forEach((h) => cells.add(h.index));
  const commands: Command[] = [...cells].map((index) => ({ kind: 'cell', index }));
  if (
    !legalMoves(match.board, match.turn).some((i) => !match.rpg.heroes.some((h) => h.index === i))
  )
    commands.push({ kind: 'pass' });
  try {
    activateHeroSkill(match.rpg, match.turn, HEROES[match.heroes[match.turn - 1]], match.board);
    commands.push({ kind: 'skill' });
  } catch {
    /* 現在の局面で発動できないスキルは候補にしない。 */
  }
  return commands;
}
export function transition(input: Match, command: Command): Match {
  if (!available(input).some((c) => JSON.stringify(c) === JSON.stringify(command)))
    throw new Error('現在はその行動を選べません');
  const m = structuredClone(input),
    actor = m.turn;
  let q = m.quests[actor];
  const before = new Set(completedQuests(q).map((x) => x.id));
  m.log = [];
  m.rpg.event = undefined;
  if (command.kind === 'skill') {
    m.rpg = activateHeroSkill(m.rpg, actor, HEROES[m.heroes[actor - 1]], m.board);
  } else if (command.kind === 'cell') {
    const index = command.index,
      base = m.rpg.heroes.find((h) => h.index === index);
    if (base) {
      m.rpg = attackHero(m.rpg, base.owner, index);
      q = progressQuest(q, 'corner');
    } else {
      const count = flips(m.board, index, actor).length;
      m.board = applyPlace(m.board, index, actor);
      m.rpg = awardExperience(m.rpg, actor, count);
      q = progressQuest(q, 'flip', count);
      q = progressQuest(q, 'place');
      m.log.push(`${count}石を反転`);
      const terrain = STAGES[m.stage].terrain.find((t) => t.index === index);
      if (terrain?.type === 'healing') {
        const hero = m.rpg.heroes.find((h) => h.owner === actor && !h.defeated && !h.shield);
        if (hero) hero.shield = true;
        m.log.push('回復地：防御回復');
      }
      if (terrain?.type === 'magic') {
        m.rpg = awardExperience(m.rpg, actor, 3);
        m.log.push('魔法陣：経験値+3');
      }
    }
  } else m.log.push('通常パス');
  q = q.map((x) =>
    x.id === 'party'
      ? { ...x, progress: Math.min(x.goal, Math.max(x.progress, party(m, actor).length)) }
      : x,
  );
  for (const item of completedQuests(q))
    if (!before.has(item.id)) {
      m.rpg = awardExperience(m.rpg, actor, item.reward);
      m.log.push(`クエスト達成：${item.text}`);
    }
  m.quests[actor] = q;
  m.ply++;
  m.rpg.turnCount++;
  if (m.rpg.event) m.log.push(m.rpg.event);
  if (m.rpg.level[actor] > input.rpg.level[actor]) m.log.push(`レベル${m.rpg.level[actor]}に上昇`);
  const tally = scores(m.board);
  if (m.victory === 'base') m.winner = isVictory(m.rpg);
  if (m.victory === 'quest' && completedQuests(q).length === 3) m.winner = actor;
  const canPlace = (player: 1 | 2) =>
    legalMoves(m.board, player).some(
      (i) => !m.rpg.heroes.some((h) => h.index === i),
    );
  if (m.victory === 'score' && !canPlace(1) && !canPlace(2))
    m.winner = tally[0] === tally[1] ? 0 : tally[0] > tally[1] ? 1 : 2;
  if (m.winner === null && (m.ply >= 120 || (!canPlace(1) && !canPlace(2)))) {
    const rank = (p: 1 | 2) =>
      m.rpg.heroes.filter((h) => h.owner === p && !h.defeated).length * 10000 +
      completedQuests(m.quests[p]).length * 100 +
      tally[p - 1];
    m.winner = rank(1) === rank(2) ? 0 : rank(1) > rank(2) ? 1 : 2;
    m.log.push((m.ply >= 120 ? '120手' : '双方着手不可') + 'の判定：拠点数→達成クエスト数→石数');
  }
  m.turn = actor === 1 ? 2 : 1;
  return m;
}
