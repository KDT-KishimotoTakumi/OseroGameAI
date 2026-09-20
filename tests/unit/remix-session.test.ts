import { expect, it } from 'vitest';
import { RemixSession } from '../../src/application/remix-session';
import { available } from '../../src/domain/remix-match';
it('選択・取消で対局を変えず、予告と確定が一致する', () => {
  const session = new RemixSession(),
    original = structuredClone(session.match);
  const preview = session.select(available(session.match)[0]);
  expect(session.match).toEqual(original);
  session.cancel();
  expect(session.match).toEqual(original);
  session.select(preview.command);
  expect(session.confirm()).toEqual(preview);
  expect(() => session.confirm()).toThrow();
});
it('古い版・世代を拒否し、再開始後に古い演出で解除しない', () => {
  const session = new RemixSession();
  session.select(available(session.match)[0]);
  session.match.version++;
  expect(() => session.confirm()).toThrow();
  session.start();
  const generation = session.generation;
  session.select(available(session.match)[0]);
  session.confirm();
  const version = session.match.version;
  session.start();
  session.busy = true;
  session.finish(generation, version);
  expect(session.busy).toBe(true);
});
it('AIの先手と人の先手が再戦ごとに交代する', () => {
  const session = new RemixSession();
  session.start('ai');
  expect(session.match.turn).toBe(session.human);
  session.start('ai', true);
  expect(session.match.turn).not.toBe(session.human);
  session.start('ai', true);
  expect(session.match.turn).toBe(session.human);
});
