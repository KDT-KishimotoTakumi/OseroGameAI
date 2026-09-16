import {expect,it} from 'vitest';
import {available,createMatch,transition} from '../../src/domain/match';
it('6行動を超えても敵と敵襲クエストは生成されない',()=>{
 let m=createMatch(20);m.victory='quest';
 for(let i=0;i<20&&m.winner===null;i++) {const c=available(m).find(c=>c.kind==='cell'&&c.index>7&&c.index<56)??available(m)[0];m=transition(m,c);expect(m.rpg.enemies).toEqual([]);expect(m.log.join('')).not.toContain('敵襲');}
 expect(m.quests[1].some(q=>q.id==='enemy')).toBe(false);
});
it('両者が通常着手できなければクエスト戦も即座に決着する',()=>{
 const m=createMatch(20);m.victory='quest';m.board.fill(1);m.rpg.heroes.forEach(h=>m.board[h.index]=0);
 const end=transition(m,{kind:'pass'});expect(end.winner).not.toBeNull();expect(end.log.join('')).toContain('双方着手不可');
});
it('斥候・魔導士は敵なしで経験値を得る',()=>{
 for(const [hero,xp] of [[1,3],[2,4]]){const m=createMatch(20,0,[hero,0]);const next=transition(m,{kind:'skill'});expect(next.rpg.experience[1]).toBe(xp);expect(m.rpg.experience[1]).toBe(0);}
});
