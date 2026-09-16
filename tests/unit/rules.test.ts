import { describe, expect, it } from 'vitest';
import { flips, legalMoves, scores } from '../../src/domain/rules';
import { createGame, act, settle } from '../../src/domain/transition';
import type { Board } from '../../src/domain/types';
const standard = (): Board => { const b: Board = Array(64).fill(0); b[27]=2; b[28]=1; b[35]=1; b[36]=2; return b; };
describe('盤面と未来予約', () => {
  it('初期合法手と入力盤面の不変性', () => {
    const b=standard(); expect(legalMoves(b,1)).toEqual([19,26,37,44]);
    const s=createGame(b); const next=act(s,{kind:'place',index:19});
    expect(scores(next.board)).toEqual([4,1]); expect(b).toEqual(standard()); expect(next.turn).toBe(2);
  });
  it('盤外・占有・反転なしは拒否し状態を変えない', () => {
    const s=createGame(standard()); for(const index of [-1,64,27,0]) expect(()=>act(s,{kind:'place',index})).toThrow();
    expect(s.version).toBe(0); expect(flips(s.board,64,1)).toEqual([]);
  });
  it('8方向をまとめて反転する', () => {
    const b: Board=Array(64).fill(0); for(const [r,c] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {b[(3+r)*8+3+c]=2; b[(3+2*r)*8+3+2*c]=1;}
    expect(flips(b,27,1)).toHaveLength(8);
  });
  it('空きマスなら不合法でも予約でき、発動時に失効する', () => {
    const a=act(createGame(standard()),{kind:'reserve',index:0}); expect(a.remaining[1]).toBe(4); expect(a.board[0]).toBe(0);
    const b=act(a,{kind:'place',index:20}); expect(b.pending[1]).toBeNull(); expect(b.turn).toBe(2);
    expect(b.events.some(e=>e.kind==='expired')).toBe(true); expect(b.remaining[1]).toBe(4);
  });
  it('双方が予約すると手番順に解決し、成功後は追加行動しない', () => {
    const a=act(createGame(standard()),{kind:'reserve',index:19});
    const b=act(a,{kind:'reserve',index:19});
    expect(b.board[19]).toBe(1); expect(b.turn).toBe(1); expect(b.pending[2]).toBeNull();
    expect(b.events.filter(e=>e.kind==='resolved')).toHaveLength(1); expect(b.events.filter(e=>e.kind==='expired')).toHaveLength(1);
  });
  it('予約先を相手が合法手で占有できる', () => {
    const a=act(createGame(standard()),{kind:'reserve',index:20}); const b=act(a,{kind:'place',index:20});
    expect(b.board[20]).toBe(2); expect(b.events.some(e=>e.kind==='expired')).toBe(true);
  });
  it('合法手ありでパス不可、回数0で予約不可', () => {
    const s=createGame(standard()); expect(()=>act(s,{kind:'pass'})).toThrow(); s.remaining[1]=0;
    expect(()=>act(s,{kind:'reserve',index:0})).toThrow();
  });
  it('双方合法手なしなら予約解決より終局が優先される', () => {
    const s=createGame(Array(64).fill(1)); s.pending[1]=0; const n=settle(s);
    expect(n.status).toBe('finished'); expect(n.pending[1]).toBeNull(); expect(n.events.at(-1)?.kind).toBe('end');
  });
  it('満盤の同数は引き分け判定用に32対32を返す', () => {
    const b: Board=Array.from({length:64},(_,i)=>i%2?1:2); expect(scores(b)).toEqual([32,32]); expect(settle(createGame(b)).status).toBe('finished');
  });
});
