import { describe, expect, it } from 'vitest';
import {
  GUIDE_STEPS,
  ONBOARDING_KEY,
  markGuideSeen,
  moveGuideStep,
  shouldShowGuide,
} from '../../src/presentation/onboarding';

const memory = (initial: Record<string, string> = {}) => {
  const data = { ...initial };
  return {
    data,
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
};
const broken = {
  getItem: (): string | null => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

describe('初回ガイド', () => {
  it('未表示なら表示し、表示済みなら表示しない', () => {
    expect(shouldShowGuide(memory())).toBe(true);
    expect(shouldShowGuide(memory({ [ONBOARDING_KEY]: 'done' }))).toBe(false);
  });
  it('保存領域が使えない場合も初回ガイドを表示する', () => {
    expect(shouldShowGuide(null)).toBe(true);
    expect(shouldShowGuide(broken)).toBe(true);
  });
  it('表示済みを保存し、失敗を例外にせず返す', () => {
    const storage = memory();
    expect(markGuideSeen(storage)).toBe(true);
    expect(storage.data[ONBOARDING_KEY]).toBe('done');
    expect(shouldShowGuide(storage)).toBe(false);
    expect(markGuideSeen(broken)).toBe(false);
    expect(markGuideSeen(null)).toBe(false);
  });
  it('手順の移動は先頭と末尾で止まる', () => {
    const last = GUIDE_STEPS.length - 1;
    expect(moveGuideStep(0, -1)).toBe(0);
    expect(moveGuideStep(0, 1)).toBe(1);
    expect(moveGuideStep(last, 1)).toBe(last);
    expect(moveGuideStep(last, -1)).toBe(last - 1);
  });
  it('全手順に見出しと説明があり、現行ルールの要点を含む', () => {
    expect(GUIDE_STEPS.length).toBeGreaterThanOrEqual(5);
    for (const step of GUIDE_STEPS) {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.text.length).toBeGreaterThan(0);
    }
    const all = GUIDE_STEPS.map((step) => step.text).join('');
    for (const keyword of ['HP50', '1ダメージ', '区画', '攻撃を決定', '連続', 'パス', '10手', '練習モード'])
      expect(all).toContain(keyword);
  });
});
