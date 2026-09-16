import type { Board, Cell } from './types';
// 中央4石に180度対称の各色2石を加える。候補ごとに距離と配置を変える。
const pairs: readonly (readonly [number,number])[] = [[18,19],[10,19],[2,19],[9,19],[17,19],[11,19],[1,19],[3,19]];
export const OPENINGS:readonly Board[]=pairs.map(([cyan,orange])=>{
  const board=Array<Cell>(64).fill(0);
  board[27]=1;board[36]=1;board[28]=2;board[35]=2;
  board[cyan]=1;board[63-cyan]=1;board[orange]=2;board[63-orange]=2;
  return board;
});
export function opening(seed=Date.now()):Board{return [...OPENINGS[Math.abs(Math.floor(seed))%OPENINGS.length]];}
