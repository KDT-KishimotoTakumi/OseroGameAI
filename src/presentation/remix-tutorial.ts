import { createRemixMatch, simulate, sameCommand } from '../domain/remix-match';
import type { RemixMatch, RemixCommand } from '../domain/remix-types';
export interface Lesson {
  title: string;
  text: string;
  start: RemixMatch;
  expected: RemixCommand;
  damage: number;
  requireCancel?: boolean;
}
function captureBoard() {
  const match = createRemixMatch();
  match.board.fill(0);
  for (const index of [2, 17, 11]) match.board[index] = 1;
  for (const index of [1, 9, 10]) match.board[index] = 2;
  return match;
}
function rotationBoard() {
  const match = createRemixMatch();
  match.board.fill(0);
  match.board[0] = match.board[5] = 1;
  match.board[4] = 2;
  return match;
}
const place = { kind: 'cell', index: 0 } as const;
export const PRACTICE: Lesson[] = [
  {
    title: '1：石を置いて攻撃',
    text: 'A1を選び、予告を確認して「攻撃を決定」を押します。相手の石を1個反転して1ダメージ。',
    start: (() => {
      const match = createRemixMatch();
      match.board.fill(0);
      match.board[1] = 2;
      match.board[2] = 1;
      return match;
    })(),
    expected: place,
    damage: 1,
  },
  {
    title: '2：区画を右に回す',
    text: '「区画を回す」を選び、左上を右回りにします。区画の外にあるE1の石まで反転し、1ダメージになります。',
    start: rotationBoard(),
    expected: { kind: 'rotate', quadrant: 0, direction: 'right' },
    damage: 1,
  },
  {
    title: '3：左回りと取り消し',
    text: '左上を左回りにして予告を出し、一度「取り消す」を押しましょう。もう一度選んで決定すると、この練習に成功します。',
    start: (() => {
      const match = rotationBoard();
      match.board[0] = 0;
      match.board[27] = 1;
      return match;
    })(),
    expected: { kind: 'rotate', quadrant: 0, direction: 'left' },
    damage: 1,
    requireCancel: true,
  },
  {
    title: '4：連続攻撃',
    text: 'A1への着手で、B1→B2→C2と攻撃が広がります。予告の3ダメージを確かめて決定します。',
    start: captureBoard(),
    expected: place,
    damage: 3,
  },
  {
    title: '5：HPを0にして勝つ',
    text: '相手HPは3。A1の連続攻撃でHPを0にして勝利しましょう。',
    start: (() => {
      const match = captureBoard();
      match.hp[2] = 3;
      return match;
    })(),
    expected: place,
    damage: 3,
  },
];
export function lessonSuccess(lesson: Lesson, command: RemixCommand, cancelled: boolean): boolean {
  if (lesson.requireCancel && !cancelled) return false;
  return (
    sameCommand(lesson.expected, command) &&
    simulate(lesson.start, command).damage === lesson.damage
  );
}
