export type VictoryRule = 'base'|'score'|'quest';
export function randomVictory(seed=Date.now()): VictoryRule { return (['base','score','quest'] as const)[Math.abs(Math.floor(seed))%3]; }
export function checkVictory(rule:VictoryRule, score:[number,number], questCount:number, bases:[boolean,boolean]): 1|2|null { if(rule==='score' && score[0]+score[1]>=64) return score[0]===score[1]?null:score[0]>score[1]?1:2; if(rule==='quest' && questCount>=3) return null; if(rule==='base') { if(bases[0]) return 1; if(bases[1]) return 2; } return null; }
