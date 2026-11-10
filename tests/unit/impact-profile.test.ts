import { describe, expect, it } from 'vitest';
import {
  IMPACT_LABELS,
  comboLabel,
  impactProfile,
  parseImpact,
  shakeAmplitude,
} from '../../src/presentation/impact-profile';

describe('演出の迫力設定', () => {
  it('強・中・なしの順に並び、未設定や不正値は中になる', () => {
    expect(Object.entries(IMPACT_LABELS)).toEqual([
      ['strong', '強'],
      ['medium', '中'],
      ['off', 'なし'],
    ]);
    for (const value of [undefined, null, '', 'max', 3, {}])
      expect(parseImpact(value)).toBe('medium');
    for (const value of ['strong', 'medium', 'off'] as const)
      expect(parseImpact(value)).toBe(value);
  });
  it('なし・演出軽減では追加演出を無効にする', () => {
    expect(impactProfile('off', false)).toBeNull();
    expect(impactProfile('strong', true)).toBeNull();
    expect(impactProfile('medium', true)).toBeNull();
  });
  it('強は中より衝撃波・揺れ・閃光がすべて大きい', () => {
    const strong = impactProfile('strong', false)!;
    const medium = impactProfile('medium', false)!;
    expect(strong.shockwaveScale).toBeGreaterThan(medium.shockwaveScale);
    expect(strong.flashOpacity).toBeGreaterThan(medium.flashOpacity);
    expect(strong.victoryShakePx).toBeGreaterThan(medium.victoryShakePx);
    expect(shakeAmplitude(strong, 1, 1)).toBeGreaterThan(shakeAmplitude(medium, 1, 1));
    for (const profile of [strong, medium]) expect(profile.flashOpacity).toBeLessThanOrEqual(1);
  });
  it('揺れは連鎖とダメージで増え、上限で止まる', () => {
    for (const profile of [impactProfile('strong', false)!, impactProfile('medium', false)!]) {
      expect(shakeAmplitude(profile, 2, 3)).toBeGreaterThan(shakeAmplitude(profile, 1, 1));
      expect(shakeAmplitude(profile, 99, 999)).toBe(profile.maxShakePx);
      expect(shakeAmplitude(profile, 0, 0)).toBe(0);
    }
  });
  it('COMBO表示は2連鎖以上', () => {
    expect(comboLabel(0)).toBeNull();
    expect(comboLabel(1)).toBeNull();
    expect(comboLabel(2)).toBe('2 CHAIN!');
    expect(comboLabel(5)).toBe('5 CHAIN!');
  });
});
