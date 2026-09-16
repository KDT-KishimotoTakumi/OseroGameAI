import { expect, it } from 'vitest';
import { activateHeroSkill } from '../../src/domain/hero-skills';
import { HEROES } from '../../src/domain/heroes';
import { createRpg, defeatEnemy, enemyEvent } from '../../src/domain/rpg';
import type { Board } from '../../src/domain/types';

it('防御回復は一度だけで、元の状態を変更しない', () => {
  const state=createRpg(); state.heroes[0].shield=false;
  const board=Array(64).fill(0) as Board;
  const next=activateHeroSkill(state,1,HEROES[0],board);
  expect(next.heroes[0].shield).toBe(true);
  expect(state.heroes[0].shield).toBe(false);
  expect(()=>activateHeroSkill(next,1,HEROES[0],board)).toThrow();
});
it('強敵は二度攻撃し、撃破時だけ報酬が発生する', () => {
  const state=createRpg(); state.enemies=[10]; state.enemyHp[10]=2; state.enemyElite[10]=true;
  const hit=defeatEnemy(state,10,1);
  expect(hit.enemies).toEqual([10]); expect(hit.experience[1]).toBe(0);
  const defeated=defeatEnemy(hit,10,1);
  expect(defeated.enemies).toEqual([]); expect(defeated.experience[1]).toBe(5);
});
it('嵐では空きマスに強敵が重複せず二体出現する', () => {
  const state={...createRpg(),turnCount:12};
  const next=enemyEvent(state,Array(64).fill(0) as Board);
  expect(new Set(next.enemies).size).toBe(2);
  expect(next.enemies.every(index=>next.enemyHp[index]===2&&index!==0&&index!==63)).toBe(true);
});
