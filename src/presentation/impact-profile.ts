/** 演出設定「迫力」。追加演出（衝撃波・閃光・COMBO表示・揺れ・勝利演出）の強さだけを決める。 */
export type ImpactLevel = 'strong' | 'medium' | 'off';

/** 設定画面の並び順（強→中→なし）を兼ねる。 */
export const IMPACT_LABELS: Record<ImpactLevel, string> = {
  strong: '強',
  medium: '中',
  off: 'なし',
};

export const DEFAULT_IMPACT: ImpactLevel = 'medium';

export interface ImpactProfile {
  /** 衝撃波の最大拡大率（マス幅に対する倍率） */
  shockwaveScale: number;
  /** 連鎖時の盤面閃光の最大不透明度 */
  flashOpacity: number;
  baseShakePx: number;
  shakePerChainPx: number;
  maxShakePx: number;
  victoryShakePx: number;
}

const PROFILES: Record<Exclude<ImpactLevel, 'off'>, ImpactProfile> = {
  strong: {
    shockwaveScale: 3.2,
    flashOpacity: 0.55,
    baseShakePx: 4,
    shakePerChainPx: 2.5,
    maxShakePx: 14,
    victoryShakePx: 18,
  },
  medium: {
    shockwaveScale: 2.2,
    flashOpacity: 0.3,
    baseShakePx: 2,
    shakePerChainPx: 1.2,
    maxShakePx: 7,
    victoryShakePx: 9,
  },
};

export function parseImpact(value: unknown): ImpactLevel {
  return value === 'strong' || value === 'medium' || value === 'off' ? value : DEFAULT_IMPACT;
}

/** 「なし」または演出軽減時は null を返し、追加演出を一切行わない。 */
export function impactProfile(level: ImpactLevel, reduced: boolean): ImpactProfile | null {
  if (reduced || level === 'off') return null;
  return PROFILES[level];
}

export function shakeAmplitude(profile: ImpactProfile, chain: number, damage: number): number {
  if (chain <= 0 || damage <= 0) return 0;
  const amplitude = profile.baseShakePx + profile.shakePerChainPx * (chain - 1) + damage * 0.5;
  return Math.min(profile.maxShakePx, amplitude);
}

export function comboLabel(chain: number): string | null {
  return chain >= 2 ? `${chain} CHAIN!` : null;
}
