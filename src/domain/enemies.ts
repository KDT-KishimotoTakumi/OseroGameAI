export type EnemyType = 'normal'|'elite';
export type Enemy = { index:number; type:EnemyType; hp:number; reward:number };
export function spawnEnemy(index:number, type:EnemyType='normal'): Enemy { return {index,type,hp:type==='elite'?2:1,reward:type==='elite'?5:2}; }
export function hitEnemy(enemy:Enemy): Enemy|null { const next={...enemy,hp:enemy.hp-1}; return next.hp>0?next:null; }
