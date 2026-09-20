import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { SynthAudio } from '../../src/infrastructure/synth-audio';

const parameter = () => ({
  setValueAtTime: vi.fn(),
  setTargetAtTime: vi.fn(),
  linearRampToValueAtTime: vi.fn(),
  exponentialRampToValueAtTime: vi.fn(),
});
const contexts: FakeContext[] = [];
class FakeNode {
  connect = vi.fn(() => this);
  disconnect = vi.fn();
  gain = parameter();
  frequency = parameter();
  type = 'sine';
  onended: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
}
class FakeContext {
  currentTime = 0;
  state = 'suspended';
  destination = new FakeNode();
  oscillators: FakeNode[] = [];
  gains: FakeNode[] = [];
  constructor() {
    contexts.push(this);
  }
  createGain() {
    const node = new FakeNode();
    this.gains.push(node);
    return node;
  }
  createDynamicsCompressor() {
    return new FakeNode();
  }
  createOscillator() {
    const node = new FakeNode();
    this.oscillators.push(node);
    return node;
  }
  resume = vi.fn(async () => {
    this.state = 'running';
  });
  suspend = vi.fn(async () => {
    this.state = 'suspended';
  });
  close = vi.fn(async () => {
    this.state = 'closed';
  });
}
let engine: SynthAudio;
beforeEach(() => {
  vi.useFakeTimers();
  contexts.length = 0;
  vi.stubGlobal('AudioContext', FakeContext);
  engine = new SynthAudio();
});
afterEach(() => {
  engine.dispose();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const defaults = { sound: true, music: true, soundVolume: 0.5, musicVolume: 0.3 };

test('操作前は無音、音源とタイマーを共有し、BGMとSEを独立して消音', async () => {
  engine.configure(defaults);
  engine.play('place');
  expect(contexts).toHaveLength(0);
  await engine.unlock();
  const context = contexts[0];
  expect(context.oscillators.length).toBeGreaterThan(0);
  const count = context.oscillators.length;
  await engine.unlock();
  expect(contexts).toHaveLength(1);
  expect(vi.getTimerCount()).toBe(1);
  engine.configure({ ...defaults, music: false });
  expect(vi.getTimerCount()).toBe(0);
  expect(context.oscillators.every((node) => node.stop.mock.calls.length === 2)).toBe(true);
  engine.play('chain', 3);
  expect(context.oscillators).toHaveLength(count + 2);
  engine.configure({ ...defaults, music: false, sound: false });
  engine.play('place');
  expect(context.oscillators).toHaveLength(count + 2);
  engine.configure({ ...defaults, sound: false });
  expect(vi.getTimerCount()).toBe(1);
  const withMusic = context.oscillators.length;
  engine.play('victory');
  expect(context.oscillators).toHaveLength(withMusic);
});
test('非表示と終局でBGM停止、復帰で再開、破棄で全資源を解放', async () => {
  await engine.unlock();
  const context = contexts[0];
  await engine.setHidden(true);
  expect(context.state).toBe('suspended');
  expect(vi.getTimerCount()).toBe(0);
  const count = context.oscillators.length;
  engine.play('rotate');
  expect(context.oscillators).toHaveLength(count);
  await engine.setHidden(false);
  expect(context.state).toBe('running');
  expect(vi.getTimerCount()).toBe(1);
  engine.setPlaying(false);
  expect(vi.getTimerCount()).toBe(0);
  engine.play('victory');
  expect(context.oscillators.length).toBeGreaterThan(count);
  engine.setPlaying(true);
  expect(vi.getTimerCount()).toBe(1);
  engine.dispose();
  expect(context.state).toBe('closed');
  expect(vi.getTimerCount()).toBe(0);
  await engine.unlock();
  expect(contexts).toHaveLength(1);
});
test('ゼロ音量・不正音量を処理し、連鎖音の高さは上限で止める', async () => {
  engine.configure({ ...defaults, musicVolume: 0, soundVolume: 0 });
  await engine.unlock();
  expect(contexts[0].oscillators).toHaveLength(0);
  expect(vi.getTimerCount()).toBe(0);
  engine.configure({ ...defaults, music: false, soundVolume: 4 });
  engine.play('chain', 100);
  const high = contexts[0].oscillators[0].frequency.setValueAtTime.mock.calls[0][0];
  engine.play('chain', 8);
  expect(contexts[0].oscillators[2].frequency.setValueAtTime.mock.calls[0][0]).toBe(high);
  expect(contexts[0].gains[1].gain.setTargetAtTime).toHaveBeenLastCalledWith(1, 0, 0.02);
});
test('着手音と回転音を鳴らし、終了した音源を解放する', async () => {
  engine.configure({ ...defaults, music: false });
  await engine.unlock();
  const context = contexts[0];
  engine.play('place');
  engine.play('rotate');
  expect(context.oscillators).toHaveLength(4);
  context.oscillators[0].onended?.();
  expect(context.oscillators[0].disconnect).toHaveBeenCalled();
  expect(context.gains[2].disconnect).toHaveBeenCalled();
});
