import { afterEach, expect, it, vi } from 'vitest';
import { TurnNotice } from '../../src/application/turn-notice';
afterEach(() => vi.useRealTimers());
it('2秒間だけ表示し、同じ手番の再描画では待機を延長しない', () => {
  vi.useFakeTimers();
  const notice = new TurnNotice();
  const done = vi.fn();
  notice.begin('0:0', 'あなたの番です', done);
  vi.advanceTimersByTime(1999);
  expect(notice.active).toBe(true);
  expect(done).not.toHaveBeenCalled();
  expect(notice.begin('0:0', '重複', done)).toBe(false);
  vi.advanceTimersByTime(1);
  expect(notice.active).toBe(false);
  expect(done).toHaveBeenCalledTimes(1);
  expect(notice.begin('0:0', '同じ番', done)).toBe(false);
});
it('途中の再開始や練習移動で古いパス・AI開始を取り消す', () => {
  vi.useFakeTimers();
  const notice = new TurnNotice();
  const old = vi.fn(),
    next = vi.fn();
  notice.begin('0:0', '前の番', old);
  vi.advanceTimersByTime(1000);
  notice.cancel();
  notice.begin('1:0', '新しい番', next);
  vi.advanceTimersByTime(1000);
  expect(old).not.toHaveBeenCalled();
  expect(next).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1000);
  expect(next).toHaveBeenCalledTimes(1);
});
it('操作で案内を飛ばすと即座に手番を始め、二重に開始しない', () => {
  vi.useFakeTimers();
  const notice = new TurnNotice();
  const done = vi.fn();
  expect(notice.skip()).toBe(false);
  notice.begin('0:0', 'あなたの番です', done);
  vi.advanceTimersByTime(300);
  expect(notice.skip()).toBe(true);
  expect(notice.active).toBe(false);
  expect(notice.text).toBe('');
  expect(done).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(5000);
  expect(done).toHaveBeenCalledTimes(1);
  expect(notice.skip()).toBe(false);
  expect(notice.begin('0:0', '同じ番', done)).toBe(false);
});
