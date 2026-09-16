import { applyPlace, legalMoves } from './rules';
import type { Action, Board, Event, GameState } from './types';
export const createGame = (board: Board, turn: 1 | 2 = 1): GameState => ({ board: [...board], turn, remaining: [0, 5, 5], pending: [null, null, null], status: 'playing', version: 0, events: [] });
const opponent = (p: 1 | 2): 1 | 2 => p === 1 ? 2 : 1;
const add = (s: GameState, event: Event): GameState => ({ ...s, events: [...s.events, event], version: s.version + 1 });
export function settle(state: GameState): GameState {
  if (state.status === 'finished') return state;
  if (state.board.every((v) => v !== 0) || (!legalMoves(state.board, 1).length && !legalMoves(state.board, 2).length)) {
    const pending = [null, null, null]; const next = add({ ...state, pending, status: 'finished' }, { kind: 'end', text: '対局終了' }); return next;
  } return state;
}
function resolvePending(state: GameState): GameState {
  const p = state.turn; const index = state.pending[p]; if (index == null) return state;
  const pending = [...state.pending]; pending[p] = null;
  try { const board = applyPlace(state.board, index, p); return add({ ...state, board, pending }, { kind: 'resolved', text: '未来予約が発動しました', index }); }
  catch { return add({ ...state, pending }, { kind: 'expired', text: '未来予約が失効しました', index }); }
}
function advance(state: GameState): GameState {
  let next = settle(state); let guard = 0;
  while (next.status === 'playing' && next.pending[next.turn] != null && guard++ < 2) {
    const before = next.turn; next = resolvePending(next); next = settle({ ...next, turn: opponent(before) });
  }
  return next;
}
export function act(input: GameState, action: Action): GameState {
  if (input.status === 'finished') throw new Error('対局は終了しています');
  const state = settle(input); if (state.status === 'finished') return state;
  if (state.pending[state.turn] != null) { throw new Error('予約を解決中です'); }
  const p = state.turn;
  if (action.kind === 'place') { if (!legalMoves(state.board, p).includes(action.index)) throw new Error('不正な着手です'); const board = applyPlace(state.board, action.index, p); return advance(add({ ...state, board, turn: opponent(p) }, { kind: 'placed', text: '通常手を確定しました', index: action.index })); }
  if (action.kind === 'reserve') { if (state.remaining[p] <= 0 || !Number.isInteger(action.index) || action.index < 0 || action.index >= 64 || state.board[action.index] !== 0) throw new Error('予約できないマスです'); const pending = [...state.pending]; pending[p] = action.index; const remaining = [...state.remaining] as [number, number, number]; remaining[p]--; return advance(add({ ...state, pending, remaining, turn: opponent(p) }, { kind: 'reserved', text: '未来予約を確定しました', index: action.index })); }
  if (legalMoves(state.board, p).length) throw new Error('合法手があるためパスできません'); return advance(add({ ...state, turn: opponent(p) }, { kind: 'passed', text: '通常パス' }));
}
