import { expect, it } from 'vitest';
import { PRACTICE, lessonSuccess } from '../../src/presentation/remix-tutorial';
import { simulate } from '../../src/domain/remix-match';
it('全課題が実ルールで達成でき、取消課題とHP勝利を判定する', () => {
  for (const lesson of PRACTICE) {
    expect(lessonSuccess(lesson, lesson.expected, true)).toBe(true);
    expect(simulate(lesson.start, lesson.expected).damage).toBe(lesson.damage);
  }
  expect(lessonSuccess(PRACTICE[2], PRACTICE[2].expected, false)).toBe(false);
  expect(simulate(PRACTICE[4].start, PRACTICE[4].expected).next.winner).toBe(1);
});
