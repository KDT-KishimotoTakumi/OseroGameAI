import { describe, expect, it } from 'vitest';
import { createRpg, awardExperience, attackHero, isVictory, connectedParty } from '../../src/domain/rpg';
import { spawnEnemy, hitEnemy } from '../../src/domain/enemies';
import { terrainEffect } from '../../src/domain/terrain';
import { randomQuests, progressQuest, completedQuests } from '../../src/domain/quests';
import { randomVictory } from '../../src/domain/victory';

describe('RPG拡張ルール', () => {
  it('英雄は一度防御してから撃破される', () => { let state=createRpg(); state=attackHero(state,2); expect(state.heroes[1].shield).toBe(false); state=attackHero(state,2); expect(isVictory(state)).toBe(1); });
  it('経験値でレベルが上がる', () => { const state=awardExperience(createRpg(),1,10); expect(state.level[1]).toBe(2); });
  it('敵は強敵なら2回攻撃が必要', () => { const enemy=spawnEnemy(10,'elite'); expect(hitEnemy(enemy)?.hp).toBe(1); expect(hitEnemy(hitEnemy(enemy)!) ).toBeNull(); });
  it('固定地形とクエストを生成する', () => { expect(terrainEffect(9)).toBe('healing'); const quests=progressQuest(randomQuests(0),'flip',3); expect(completedQuests(quests).length).toBeGreaterThan(0); });
  it('勝利条件は既知の3種類', () => { expect(['base','score','quest']).toContain(randomVictory(2)); });
  it('英雄から連結した仲間を数える', () => { const board=Array(64).fill(0) as (0|1|2)[]; board[0]=1; board[1]=1; expect(connectedParty(board,{owner:1,index:0,shield:true,defeated:false})).toEqual([0,1]); });
});
