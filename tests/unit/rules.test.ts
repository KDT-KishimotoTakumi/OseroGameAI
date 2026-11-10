import { describe, expect, it } from 'vitest';
import { flips, legalMoves, scores } from '../../src/domain/rules';
import type { Board } from '../../src/domain/types';
const standard = (): Board => { const b: Board = Array(64).fill(0); b[27]=2; b[28]=1; b[35]=1; b[36]=2; return b; };
describe('盤面の基本ルール', () => {
  it('初期合法手と入力盤面の不変性', () => {
    const b=standard(); expect(legalMoves(b,1)).toEqual([19,26,37,44]);
    expect(flips(b,19,1)).toEqual([27]); expect(b).toEqual(standard());
  });
  it('盤外・占有・反転なしは反転を返さない', () => {
    const b=standard(); for(const index of [-1,64,27,0,1.5]) expect(flips(b,index,1)).toEqual([]);
  });
  it('8方向をまとめて反転する', () => {
    const b: Board=Array(64).fill(0); for(const [r,c] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {b[(3+r)*8+3+c]=2; b[(3+2*r)*8+3+2*c]=1;}
    expect(flips(b,27,1)).toHaveLength(8);
  });
  it('満盤では双方合法手なし', () => {
    const b: Board=Array(64).fill(1); expect(legalMoves(b,1)).toEqual([]); expect(legalMoves(b,2)).toEqual([]);
  });
  it('満盤の同数は32対32を返す', () => {
    const b: Board=Array.from({length:64},(_,i)=>i%2?1:2); expect(scores(b)).toEqual([32,32]);
  });
});
