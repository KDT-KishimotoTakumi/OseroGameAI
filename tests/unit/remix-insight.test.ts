import { expect, it } from 'vitest';
import { available, createRemixMatch, simulate } from '../../src/domain/remix-match';
import { followUpDamage } from '../../src/domain/remix-insight';

it('回転後の盤面で、次の自分の番に石を置いて狙える最大ダメージを返す', () => {
  const match = createRemixMatch();
  const copy = structuredClone(match);
  for (const command of available(match).filter((move) => move.kind === 'rotate')) {
    const after = simulate(match, command).next;
    const expected = Math.max(
      0,
      ...available({ ...structuredClone(after), turn: match.turn })
        .filter((move) => move.kind === 'cell')
        .map((move) => simulate({ ...structuredClone(after), turn: match.turn }, move).damage),
    );
    expect(followUpDamage(after, match.turn)).toBe(expected);
    expect(after.turn).not.toBe(match.turn);
  }
  expect(match).toEqual(copy);
});
it('置けるマスがない・終局済みなら0', () => {
  const match = createRemixMatch();
  match.board.fill(1);
  expect(followUpDamage(match, 1)).toBe(0);
  const ended = createRemixMatch();
  ended.winner = 2;
  expect(followUpDamage(ended, 1)).toBe(0);
});
it('回転直後の番は石を置く規則に従い、回転は候補に含めない', () => {
  const match = createRemixMatch();
  const rotate = available(match).find((move) => move.kind === 'rotate')!;
  const after = simulate(match, rotate).next;
  const placeOnly = Math.max(
    0,
    ...available({ ...structuredClone(after), turn: 1 })
      .filter((move) => move.kind === 'cell')
      .map((move) => simulate({ ...structuredClone(after), turn: 1 }, move).damage),
  );
  expect(followUpDamage(after, 1)).toBe(placeOnly);
});
