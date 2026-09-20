import { applyPlace, legalMoves, scores } from './rules';
import type { Board } from './types';

export type ClassicCommand = { kind: 'cell'; index: number } | { kind: 'pass' };
export interface ClassicMatch {
  board: Board;
  turn: 1 | 2;
  ply: number;
  winner: 0 | 1 | 2 | null;
  log: string[];
}
export function createClassicMatch(): ClassicMatch {
  const board: Board = Array(64).fill(0);
  board[27] = board[36] = 2;
  board[28] = board[35] = 1;
  return { board, turn: 1, ply: 0, winner: null, log: ['通常オセロで開始'] };
}
export function classicAvailable(match: ClassicMatch): ClassicCommand[] {
  if (match.winner !== null) return [];
  const moves = legalMoves(match.board, match.turn);
  return moves.length ? moves.map((index) => ({ kind: 'cell', index })) : [{ kind: 'pass' }];
}
export function classicTransition(input: ClassicMatch, command: ClassicCommand): ClassicMatch {
  if (
    !classicAvailable(input).some(
      (candidate) =>
        candidate.kind === command.kind &&
        (candidate.kind === 'pass' ||
          (command.kind === 'cell' && candidate.index === command.index)),
    )
  ) {
    throw new Error('現在はその行動を選べません');
  }
  const next = structuredClone(input);
  if (command.kind === 'cell') {
    next.board = applyPlace(input.board, command.index, input.turn);
    next.log = ['石を置いて相手の石を反転'];
  } else next.log = ['合法手がないためパス'];
  next.ply++;
  next.turn = input.turn === 1 ? 2 : 1;
  if (!legalMoves(next.board, 1).length && !legalMoves(next.board, 2).length) {
    const [cyan, orange] = scores(next.board);
    next.winner = cyan === orange ? 0 : cyan > orange ? 1 : 2;
    next.log.push('双方に合法手がないため、石数で決着');
  }
  return next;
}
