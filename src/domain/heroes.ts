export type HeroDef = { id:string; name:string; skill:string; power:number };
export const HEROES: readonly HeroDef[] = [
  {id:'guardian',name:'守護者',skill:'英雄拠点の防御を回復',power:2}, {id:'scout',name:'斥候',skill:'経験値を3獲得',power:1}, {id:'mage',name:'魔導士',skill:'経験値を4獲得',power:3}, {id:'commander',name:'司令官',skill:'経験値を5＋現在レベル獲得',power:2},
];
export function selectHeroes(seed=Date.now()): [HeroDef,HeroDef] { const start=Math.abs(Math.floor(seed))%HEROES.length; return [HEROES[start], HEROES[(start+1+(seed%2))%HEROES.length]]; }
