import { awardExperience, type RpgState } from './rpg';
import type { HeroDef } from './heroes';
import type { Board } from './types';

export function activateHeroSkill(
  input: RpgState,
  owner: 1 | 2,
  hero: HeroDef,
  board: Board,
): RpgState {
  void board;
  if (input.skillUsed[owner]) throw new Error('固有スキルは使用済みです');
  let next = structuredClone(input);
  if (hero.id === 'guardian') {
    const base = next.heroes.find((item) => item.owner === owner && !item.defeated && !item.shield);
    if (!base) throw new Error('防御を失った味方拠点が必要です');
    base.shield = true;
  } else if (hero.id === 'scout') {
    next = awardExperience(next, owner, 3);
  } else if (hero.id === 'mage') {
    next = awardExperience(next, owner, 4);
  } else next = awardExperience(next, owner, 5 + next.level[owner]);
  next.skillUsed[owner] = true;
  next.event = `${hero.name}の固有スキルが発動しました`;
  return next;
}
