import { expect, it } from 'vitest';
import {
  createClassicMatch,
  classicAvailable,
  classicTransition,
} from '../../src/domain/classic-match';
import { legalMoves, scores } from '../../src/domain/rules';

it('通常の4石から開始し、四隅も通常のマスとして扱う', () => {
  const match = createClassicMatch();
  expect(scores(match.board)).toEqual([2, 2]);
  expect(classicAvailable(match)).toHaveLength(4);
  match.board.fill(0);
  match.board[1] = 2;
  match.board[2] = 1;
  const next = classicTransition(match, { kind: 'cell', index: 0 });
  expect(next.board.slice(0, 3)).toEqual([1, 1, 1]);
  expect(match.board[0]).toBe(0);
});
it('置けるときはパス不可、片方が置けなければパスして対局を継続', () => {
  expect(() => classicTransition(createClassicMatch(), { kind: 'pass' })).toThrow();
  const match = createClassicMatch();
  match.board.fill(0);
  match.board[0] = 1;
  match.board[1] = 2;
  match.turn = 2;
  expect(classicAvailable(match)).toEqual([{ kind: 'pass' }]);
  const next = classicTransition(match, { kind: 'pass' });
  expect(next.turn).toBe(1);
  expect(next.winner).toBeNull();
});
it('満盤前でも双方着手不能なら石数で終局し、終了後は入力不可', () => {
  const match = createClassicMatch();
  match.board.fill(0);
  match.board[0] = 1;
  const end = classicTransition(match, { kind: 'pass' });
  expect(end.winner).toBe(1);
  expect(classicAvailable(end)).toEqual([]);
  expect(() => classicTransition(end, { kind: 'pass' })).toThrow();
});
it('同数で双方着手不能なら引き分け', () => {
  const match = createClassicMatch();
  match.board.fill(0);
  match.board[0] = 1;
  match.board[63] = 2;
  expect(classicTransition(match, { kind: 'pass' }).winner).toBe(0);
});
it('通常着手だけで対局が必ず終了する', () => {
  let match = createClassicMatch();
  for (let count = 0; count < 120 && match.winner === null; count++) {
    const previous = structuredClone(match);
    const command = classicAvailable(match)[0];
    match = classicTransition(match, command);
    expect(previous.ply + 1).toBe(match.ply);
    if (command.kind === 'cell')
      expect(legalMoves(previous.board, previous.turn)).toContain(command.index);
  }
  expect(match.winner).not.toBeNull();
});
