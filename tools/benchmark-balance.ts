import { performance } from 'node:perf_hooks';
import { createMatch, transition } from '../src/domain/match';
import { chooseRpg } from '../src/ai/rpg-search';
let maximum=0, turns=0;const wins=[0,0,0];
for(let seed=0;seed<12;seed++){
 let match=createMatch(seed,seed%3);
 while(match.winner===null){const start=performance.now();const action=chooseRpg(match,'standard');maximum=Math.max(maximum,performance.now()-start);match=transition(match,action);turns++;}
 wins[match.winner]++;
 if(match.ply>120)throw new Error('終了手数を超過');
}
console.log(JSON.stringify({対局数:12,行動数:turns,引分と各色勝利数:wins,最大思考ミリ秒:maximum}));
