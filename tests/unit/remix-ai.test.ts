import { expect, it } from 'vitest';
import { chooseRemix } from '../../src/ai/remix-search';
import { available, createRemixMatch, simulate } from '../../src/domain/remix-match';
it('各難易度で合法手を選び、入力を変更しない。時間切れでも合法手を返す', () => {
  const match = createRemixMatch(),
    copy = structuredClone(match);
  for (const level of ['beginner', 'standard', 'advanced'] as const) {
    expect(available(match)).toContainEqual(chooseRemix(match, level, { seed: 4, budgetMs: 50 }));
  }
  expect(available(match)).toContainEqual(
    chooseRemix(match, 'advanced', { now: () => 10, budgetMs: 0 }),
  );
  expect(match).toEqual(copy);
});
it('HP0の着手と着手不能時のパスを扱い、終了局面は拒否する', () => {
  const match = createRemixMatch();
  match.board.fill(0);
  match.board[1] = 2;
  match.board[2] = 1;
  match.hp[2] = 1;
  const command = chooseRemix(match);
  expect(simulate(match, command).next.winner).toBe(1);
  match.board.fill(1);
  match.lastAction[1] = 'rotate';
  expect(chooseRemix(match).kind).toBe('pass');
  match.winner = 1;
  expect(() => chooseRemix(match)).toThrow();
});
