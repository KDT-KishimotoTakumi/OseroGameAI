export type Quest = { id:string; text:string; goal:number; progress:number; reward:number };
const pool=[['flip','石を3個反転',3],['place','通常手を3回打つ',3],['party','仲間を5個つなぐ',5],['corner','拠点へ攻撃',1]] as const;
export function randomQuests(seed=Date.now()): Quest[] { return [0,1,2].map((offset)=>{const p=pool[(Math.abs(Math.floor(seed))+offset)%pool.length];return {id:p[0],text:p[1],goal:p[2],progress:0,reward:4};}); }
export function progressQuest(quests:Quest[], id:string, amount=1): Quest[] { return quests.map((quest)=>quest.id===id?{...quest,progress:Math.min(quest.goal,quest.progress+amount)}:quest); }
export function completedQuests(quests:Quest[]): Quest[] { return quests.filter((quest)=>quest.progress>=quest.goal); }
