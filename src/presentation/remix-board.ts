import { available } from '../domain/remix-match';
import { quadrantOf } from '../domain/remix-board';
import type { RemixMatch, AttackResult, Quadrant } from '../domain/remix-types';
export const playerName = (player: number) => (player === 1 ? 'シアン' : 'オレンジ');
export const coordinate = (index: number) =>
  String.fromCharCode(65 + (index % 8)) + (Math.floor(index / 8) + 1);
export interface BoardOptions {
  locked: boolean;
  input: 'cell' | 'rotate';
  preview: AttackResult | null;
  quadrant: Quadrant | null;
}
export function boardMarkup(match: RemixMatch, options: BoardOptions): string {
  const cells = new Set(
    available(match)
      .filter((command) => command.kind === 'cell')
      .map((command) => command.index),
  );
  const canRotate = available(match).some((command) => command.kind === 'rotate');
  const flips = new Set(options.preview?.waves.flat() ?? []);
  const shown = options.preview?.moved ?? match.board;
  return `<div class="board" role="group" aria-label="区画回転オセロ盤面">${shown
    .map((color, index) => {
      const selected =
        options.preview?.command.kind === 'cell' && options.preview.command.index === index;
      const actionable =
        !options.locked && (options.input === 'cell' ? cells.has(index) : canRotate);
      const wave = options.preview?.waves.findIndex((layer) => layer.includes(index)) ?? -1;
      return `<button class="cell ${color === 1 ? 'stone-cyan' : color === 2 ? 'stone-orange' : ''} ${index % 8 === 3 ? 'quarter-right' : ''} ${Math.floor(index / 8) === 3 ? 'quarter-bottom' : ''} ${options.quadrant === quadrantOf(index) ? 'selected-quarter' : ''} ${flips.has(index) ? 'preview-flip' : ''} ${selected ? 'selected-cell' : ''}" data-index="${index}" data-quadrant="${quadrantOf(index)}" aria-label="${coordinate(index)} ${color ? playerName(color) + '石' : '空き'} ${actionable ? (options.input === 'cell' ? '着手可能' : '区画を選択') : ''} ${flips.has(index) ? '反転予定 ' + (wave + 1) + '段階目' : ''}" aria-disabled="${!actionable}"><span class="coord">${coordinate(index)}</span>${color ? '<span class="stone"></span>' : cells.has(index) ? '<span class="legal-dot"></span>' : ''}${flips.has(index) ? `<span class="wave-mark">${wave + 1}</span>` : ''}</button>`;
    })
    .join('')}</div>`;
}
export function hpMarkup(match: RemixMatch): string {
  return `<div class="hp-bars">${([1, 2] as const).map((player) => `<div class="hp-card ${player === 1 ? 'cyan-hp' : 'orange-hp'}"><strong>${playerName(player)}</strong><span id="hp${player}" class="hp-value">${match.hp[player]} / 50 HP</span><div class="hp-track"><div data-hp-fill="${player}" style="width:${match.hp[player] * 2}%"></div></div></div>`).join('')}</div>`;
}
