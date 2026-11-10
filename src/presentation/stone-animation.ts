import type { Board } from '../domain/types';

/** 指定色の駒の見た目を、CSSから実際に解決された背景として取得する（駒画像の変更に追従する）。 */
function stoneImage(root: HTMLElement, color: number): string {
  const probe = document.createElement('span');
  probe.className = `cell ${color === 1 ? 'stone-cyan' : 'stone-orange'}`;
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;';
  probe.innerHTML = '<span class="stone"></span>';
  root.append(probe);
  const image = getComputedStyle(probe.firstElementChild!).backgroundImage;
  probe.remove();
  return image;
}

export async function animateFlips(
  root: HTMLElement,
  before: Board,
  after: Board,
  ms: number,
): Promise<void> {
  const pending: Promise<unknown>[] = [];
  const images = new Map<number, string>();
  after.forEach((color, index) => {
    if (!color || !before[index] || color === before[index]) return;
    const stone = root.querySelector<HTMLElement>(`[data-index="${index}"] .stone`);
    if (!stone) return;
    if (!images.has(before[index])) images.set(before[index], stoneImage(root, before[index]));
    const old = images.get(before[index])!;
    const current = getComputedStyle(stone).backgroundImage;
    const animation = stone.animate(
      [
        { transform: 'perspective(400px) rotateY(0deg)', backgroundImage: old, offset: 0 },
        { transform: 'perspective(400px) rotateY(89deg)', backgroundImage: old, offset: 0.49 },
        { transform: 'perspective(400px) rotateY(91deg)', backgroundImage: current, offset: 0.51 },
        { transform: 'perspective(400px) rotateY(180deg)', backgroundImage: current, offset: 1 },
      ],
      { duration: ms, easing: 'ease-in-out' },
    );
    pending.push(animation.finished.catch(() => undefined));
  });
  await Promise.all(pending);
}
