import { quadrantCells } from '../domain/remix-board';
import type { AttackResult, RemixMatch } from '../domain/remix-types';
import { animateFlips } from './stone-animation';
import { playFlipEffects } from './flip-effects';
export interface AnimationHooks {
  show: (match: RemixMatch, label: string) => void;
  current: () => boolean;
  signal: AbortSignal;
  ms: number;
  reduced: boolean;
  onWave?: (chain: number) => void;
}
async function waitAnimations(animations: Animation[], signal: AbortSignal) {
  const cancel = () => animations.forEach((animation) => animation.cancel());
  signal.addEventListener('abort', cancel, { once: true });
  try {
    if (signal.aborted) cancel();
    await Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)));
  } finally {
    signal.removeEventListener('abort', cancel);
  }
}
export async function playRemixAttack(
  root: HTMLElement,
  before: RemixMatch,
  result: AttackResult,
  hooks: AnimationHooks,
): Promise<void> {
  if (result.command.kind === 'pass') {
    hooks.show(result.next, '置けるマスがないためパスしました');
    return;
  }
  if (hooks.reduced) {
    if (result.waves.length) hooks.onWave?.(result.waves.length);
    hooks.show(result.next, `${result.waves.length}連鎖・${result.damage}ダメージ`);
    return;
  }
  if (result.command.kind === 'rotate') {
    const cells = quadrantCells(result.command.quadrant),
      anchors = cells.map((index) =>
        root.querySelector<HTMLElement>(`[data-index="${index}"]`)!.getBoundingClientRect(),
      );
    const centerX = (anchors[0].left + anchors[15].right) / 2,
      centerY = (anchors[0].top + anchors[15].bottom) / 2;
    const clones: HTMLElement[] = [],
      animations: Animation[] = [];
    const sign = result.command.direction === 'right' ? 1 : -1;
    cells.forEach((index, local) => {
      const stone = root.querySelector<HTMLElement>(`[data-index="${index}"] .stone`);
      if (!stone) return;
      const box = stone.getBoundingClientRect(),
        clone = stone.cloneNode(true) as HTMLElement;
      const style = getComputedStyle(stone);
      clone.className = 'animation-stone';
      clone.style.cssText = `left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px;background:${style.backgroundImage};box-shadow:${style.boxShadow};`;
      stone.style.opacity = '0';
      document.body.append(clone);
      clones.push(clone);
      const x = box.left + box.width / 2 - centerX,
        y = box.top + box.height / 2 - centerY;
      const frames = Array.from({ length: 13 }, (_, step) => {
        const angle = (((sign * Math.PI) / 2) * step) / 12;
        return {
          transform: `translate(${x * Math.cos(angle) - y * Math.sin(angle) - x}px,${x * Math.sin(angle) + y * Math.cos(angle) - y}px)`,
          offset: step / 12,
        };
      });
      void local;
      animations.push(
        clone.animate(frames, { duration: hooks.ms, easing: 'ease-in-out', fill: 'forwards' }),
      );
    });
    try {
      await waitAnimations(animations, hooks.signal);
    } finally {
      clones.forEach((clone) => clone.remove());
    }
    if (!hooks.current()) return;
  }
  const visual = structuredClone(before);
  visual.board = [...result.moved];
  hooks.show(visual, result.command.kind === 'rotate' ? '区画を回転' : '石を置いて攻撃');
  let damage = 0;
  for (let layer = 0; layer < result.waves.length; layer++) {
    if (!hooks.current()) return;
    const previous = [...visual.board];
    result.waves[layer].forEach((index) => {
      visual.board[index] = result.actor;
    });
    damage += result.waves[layer].length;
    visual.hp[result.next.turn] = Math.max(0, before.hp[result.next.turn] - damage);
    hooks.show(visual, `${layer + 1}連鎖・${damage}ダメージ`);
    hooks.onWave?.(layer + 1);
    const animations = Promise.all([
      animateFlips(root, previous, visual.board, hooks.ms),
      playFlipEffects(root, result.waves[layer], result.actor, layer + 1, hooks.ms, hooks.signal),
    ]);
    const cancel = () =>
      root.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
    hooks.signal.addEventListener('abort', cancel, { once: true });
    try {
      await animations;
    } finally {
      hooks.signal.removeEventListener('abort', cancel);
    }
  }
  if (hooks.current())
    hooks.show(result.next, `${result.waves.length}連鎖・${result.damage}ダメージ`);
}
