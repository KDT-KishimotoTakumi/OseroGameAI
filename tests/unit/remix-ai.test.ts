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
    return Math.min(
      ...available(next).map((reply) => {
        const state = simulate(next, reply).next;
        return (
          (state.hp[1] - state.hp[2]) * 100 +
          state.board.filter((cell) => cell === 1).length -
          state.board.filter((cell) => cell === 2).length
        );
      }),
    );
  };
  const command = chooseRemix(match, 'advanced', { now: () => 0 });
  expect(valueAfterReply(command)).toBe(Math.max(...available(match).map(valueAfterReply)));
});
it('同点の最善手はシードで選び分け、同じシードなら同じ手を返す（毎回同じ展開にしない）', () => {
  const match = createRemixMatch();
  for (const level of ['standard', 'advanced'] as const) {
    const picks = new Set<string>();
    for (let seed = 1; seed <= 24; seed++) {
      const first = chooseRemix(match, level, { seed, now: () => 0 });
      expect(chooseRemix(match, level, { seed, now: () => 0 })).toEqual(first);
      picks.add(JSON.stringify(first));
    }
    expect(picks.size).toBeGreaterThan(1);
  }
});
it('ハード以上は探索の末端で次の攻撃を見込み、最大ダメージだけを狙う相手に先後とも勝つ', () => {
  expect(difficultySettings.standard.threatWeight).toBe(0);
  expect(difficultySettings.advanced.threatWeight).toBeGreaterThan(0);
  expect(difficultySettings['super-hard'].threatWeight).toBeGreaterThan(0);
  const greedy = (state: ReturnType<typeof createRemixMatch>) => {
    const moves = available(state);
    const damages = moves.map((move) => simulate(state, move).damage);
    const top = Math.max(...damages);
    const pool = moves.filter((_, index) => damages[index] === top);
    return pool.find((move) => move.kind !== 'rotate') ?? pool[0];
  };
  for (const aiPlayer of [1, 2] as const) {
    let match = createRemixMatch(1);
    while (match.winner === null) {
      const command =
        match.turn === aiPlayer
          ? chooseRemix(match, 'advanced', { seed: 11 + match.ply, now: () => 0 })
          : greedy(match);
      match = simulate(match, command).next;
    }
    expect(match.winner).toBe(aiPlayer);
  }
});
