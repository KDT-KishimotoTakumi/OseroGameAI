import type { Board } from './types';

export type Hero = { owner: 1 | 2; index: number; shield: boolean; defeated: boolean };
export type RpgState = {
  heroes: Hero[];
  experience: [number, number, number];
  level: [number, number, number];
  enemies: number[];
  enemyHp: Record<number, number>;
  enemyElite: Record<number, boolean>;
  turnCount: number;
  event?: string;
  skillUsed: [boolean, boolean, boolean];
  weather: 'clear' | 'storm' | 'rift';
};

export const createRpg = (): RpgState => ({
  heroes: [
    { owner: 1, index: 0, shield: true, defeated: false },
    { owner: 2, index: 63, shield: true, defeated: false },
  ],
  experience: [0, 0, 0],
  level: [0, 1, 1],
  enemies: [],
  enemyHp: {},
  enemyElite: {},
  turnCount: 0,
  skillUsed: [false, false, false],
  weather: 'clear',
});
export function connectedParty(board: Board, hero: Hero): number[] {
  const found = new Set<number>();
  const queue = [hero.index];
  while (queue.length) {
    const index = queue.pop()!;
    if (found.has(index) || board[index] !== hero.owner) continue;
    found.add(index);
    const r = Math.floor(index / 8);
    const c = index % 8;
    for (const [dr, dc] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const rr = r + dr,
        cc = c + dc;
      if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) queue.push(rr * 8 + cc);
    }
  }
  return [...found];
}
export function awardExperience(rpg: RpgState, owner: 1 | 2, amount: number): RpgState {
  const experience = [...rpg.experience] as [number, number, number];
  const level = [...rpg.level] as [number, number, number];
  experience[owner] += amount;
  level[owner] = Math.min(10, 1 + Math.floor(experience[owner] / 10));
  return { ...rpg, experience, level };
}
export function enemyEvent(
  rpg: RpgState,
  board: Board,
  random: () => number = Math.random,
): RpgState {
  if (!rpg.turnCount || rpg.turnCount % 6) return rpg;
  const candidates = board.flatMap((cell, index) =>
    cell === 0 && ![0, 7, 56, 63].includes(index) && !rpg.enemies.includes(index) ? [index] : [],
  );
  const next = structuredClone(rpg);
  const count = rpg.turnCount % 12 === 0 ? 2 : 1;
  for (let i = 0; i < count && candidates.length; i++) {
    const index = candidates.splice(Math.floor(random() * candidates.length), 1)[0];
    const elite = rpg.turnCount % 12 === 0;
    next.enemies.push(index);
    next.enemyHp[index] = elite ? 2 : 1;
    next.enemyElite[index] = elite;
  }
  next.event = '敵襲：敵石が出現しました';
  return next;
}
export function defeatEnemy(rpg: RpgState, index: number, owner: 1 | 2): RpgState {
  if (!rpg.enemies.includes(index)) throw new Error('敵石がありません');
  const next = structuredClone(rpg);
  next.enemyHp[index] = (next.enemyHp[index] ?? 1) - (next.level[owner] >= 3 ? 2 : 1);
  if (next.enemyHp[index] > 0) {
    next.event = '強敵にダメージを与えました';
    return next;
  }
  next.enemies = next.enemies.filter((enemy) => enemy !== index);
  next.event = '敵石を撃破しました';
  return awardExperience(next, owner, next.enemyElite[index] ? 5 : 2);
}
export function useSkill(rpg: RpgState, owner: 1 | 2): RpgState {
  if (rpg.skillUsed[owner]) return rpg;
  const skillUsed = [...rpg.skillUsed] as [boolean, boolean, boolean];
  skillUsed[owner] = true;
  return awardExperience(
    {
      ...rpg,
      skillUsed,
      event: `${owner === 1 ? 'シアン' : 'オレンジ'}パーティスキル：次の攻撃を強化`,
    },
    owner,
    2,
  );
}
export function skillPower(rpg: RpgState, owner: 1 | 2): number {
  return rpg.level[owner] >= 3 ? 2 : 1;
}
export function isVictory(rpg: RpgState): 1 | 2 | null {
  const alive = rpg.heroes.filter((hero) => !hero.defeated);
  if (!alive.length || alive.some((hero) => hero.owner !== alive[0].owner)) return null;
  return alive[0].owner;
}
export function attackHero(rpg: RpgState, target: 1 | 2, index?: number): RpgState {
  const heroes = rpg.heroes.map((hero) => ({ ...hero })) as Hero[];
  const hero = heroes.find(
    (h) => h.owner === target && !h.defeated && (index === undefined || h.index === index),
  );
  if (!hero) throw new Error('攻撃対象の拠点がありません');
  if (hero.defeated) return rpg;
  if (hero.shield) {
    hero.shield = false;
    return { ...rpg, heroes, event: `${target === 1 ? 'シアン' : 'オレンジ'}英雄が防御しました` };
  }
  hero.defeated = true;
  return { ...rpg, heroes, event: `${target === 1 ? 'シアン' : 'オレンジ'}英雄拠点が陥落しました` };
}
