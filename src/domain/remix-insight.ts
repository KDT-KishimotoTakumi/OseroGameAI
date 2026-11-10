import { available, simulate } from './remix-match';
import type { Player, RemixMatch } from './remix-types';

/**
 * 回転などの直後の盤面で、次の自分の番に石を置いて狙える最大ダメージ。
 * 相手の手を打つ前の盤面での見込みであり、相手の手によって変わる。
 * 回転した次の番は石を置く規則のため、候補は着手だけに限る。
 */
export function followUpDamage(after: RemixMatch, player: Player): number {
  if (after.winner !== null) return 0;
  const mine = { ...structuredClone(after), turn: player };
  let best = 0;
  for (const command of available(mine)) {
    if (command.kind !== 'cell') continue;
    best = Math.max(best, simulate(mine, command).damage);
  }
  return best;
}

/** 相手の番の盤面で、相手が選べる着手・回転のうち最大のダメージ（反撃の危険度の目安）。 */
export function replyDamage(after: RemixMatch): number {
  if (after.winner !== null) return 0;
  let best = 0;
  for (const command of available(after)) {
    if (command.kind === 'pass') continue;
    best = Math.max(best, simulate(after, command).damage);
  }
  return best;
}

/** 決定後の盤面で、相手の反撃が自分の残りHP以上なら負ける危険がある（決着済みなら危険なし）。 */
export function lethalReply(after: RemixMatch, player: Player): boolean {
  if (after.winner !== null) return false;
  return replyDamage(after) >= after.hp[player];
}
