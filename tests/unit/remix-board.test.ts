import { expect, it } from 'vitest';
import { initialBoard, quadrantOf, rotateQuadrant } from '../../src/domain/remix-board';
import { legalMoves, scores } from '../../src/domain/rules';

it('確定した16石と両色8合法手で開始する', () => {
  const board = initialBoard();
  expect(scores(board)).toEqual([8, 8]);
  expect(legalMoves(board, 1)).toHaveLength(8);
  expect(legalMoves(board, 2)).toHaveLength(8);
  expect([3, 9, 21, 28, 35, 42, 54, 60].every((i) => board[i] === 1)).toBe(true);
});
it('左右は逆操作、4回で復元し、区画外と石数を変えない', () => {
  for (const quadrant of [0, 1, 2, 3] as const) {
    const board = initialBoard(),
      snapshot = [...board];
    let rotated = rotateQuadrant(board, quadrant, 'right');
    expect(scores(rotated)).toEqual(scores(board));
    expect(rotateQuadrant(rotated, quadrant, 'left')).toEqual(board);
    const row = quadrant >= 2 ? 4 : 0,
      col = quadrant % 2 ? 4 : 0;
    board.forEach((value, index) => {
      if (
        Math.floor(index / 8) < row ||
        Math.floor(index / 8) >= row + 4 ||
        index % 8 < col ||
        index % 8 >= col + 4
      )
        expect(rotated[index]).toBe(value);
    });
    for (let count = 0; count < 3; count++) rotated = rotateQuadrant(rotated, quadrant, 'right');
    expect(rotated).toEqual(board);
    expect(board).toEqual(snapshot);
  }
  expect(() => rotateQuadrant(initialBoard(), 4 as never, 'right')).toThrow();
  expect(() => rotateQuadrant(initialBoard(), 0, 'up' as never)).toThrow('向き');
});
it('各マスを4つの区画へ正しく割り当てる', () => {
  expect([quadrantOf(0), quadrantOf(7), quadrantOf(56), quadrantOf(63)]).toEqual([0, 1, 2, 3]);
});
