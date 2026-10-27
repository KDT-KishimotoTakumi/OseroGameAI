import { expect, it } from 'vitest';
import { chooseRemix, difficultySettings } from '../../src/ai/remix-search';
import { available, createRemixMatch, simulate } from '../../src/domain/remix-match';
it('各難易度で合法手を選び、入力を変更しない。時間切れでも合法手を返す', () => {
  const match = createRemixMatch(),
    copy = structuredClone(match);
  for (const level of ['beginner', 'standard', 'advanced', 'super-hard'] as const) {
    expect(available(match)).toContainEqual(chooseRemix(match, level, { seed: 4, budgetMs: 50 }));
  }
  expect(available(match)).toContainEqual(
    chooseRemix(match, 'advanced', { now: () => 10, budgetMs: 0 }),
  );
  expect(match).toEqual(copy);
});
it('難易度を上げると先読みが深くなり、時間切れでも完了した探索の手を返す', () => {
  expect(difficultySettings.standard.depth).toBe(1);
  expect(difficultySettings.advanced.depth).toBe(2);
  expect(difficultySettings['super-hard'].depth).toBe(4);
  const match = createRemixMatch();
  let time = 0;
  expect(available(match)).toContainEqual(
    chooseRemix(match, 'super-hard', { now: () => time++, budgetMs: 100 }),
  );
  match.hp[2] = 1;
  const move = chooseRemix(match, 'super-hard', { budgetMs: 100 });
  expect(simulate(match, move).next.winner).toBe(1);
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
it('ハードは全応手を比較し、相手の最大反撃を受けた後の評価が最良の手を選ぶ', () => {
  const match = createRemixMatch();
  const valueAfterReply = (command: ReturnType<typeof chooseRemix>) => {
    const next = simulate(match, command).next;
    return Math.min(...available(next).map((reply) => {
      const state = simulate(next, reply).next;
      return (state.hp[1] - state.hp[2]) * 100 +
        state.board.filter((cell) => cell === 1).length - state.board.filter((cell) => cell === 2).length;
    }));
  };
  const command = chooseRemix(match, 'advanced', { now: () => 0 });
  expect(valueAfterReply(command)).toBe(Math.max(...available(match).map(valueAfterReply)));
});
