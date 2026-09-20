/** 反転位置にだけ表示し、盤面の寸法やクリック判定を変えない。 */
export async function playFlipEffects(
  root: HTMLElement,
  indices: number[],
  player: number,
  chain: number,
  ms: number,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted) return;
  const nodes: HTMLElement[] = [];
  const animations: Animation[] = [];
  const color = player === 1 ? '#79f5ff' : '#ffc084';
  for (const index of indices) {
    const cell = root.querySelector<HTMLElement>(`[data-index="${index}"]`);
    if (!cell) continue;
    const ring = document.createElement('span');
    ring.className = 'flip-ring';
    ring.setAttribute('aria-hidden', 'true');
    ring.style.color = color;
    cell.append(ring);
    nodes.push(ring);
    animations.push(
      ring.animate(
        [
          { transform: 'translate(-50%, -50%) scale(.35)', opacity: 0 },
          { transform: 'translate(-50%, -50%) scale(.7)', opacity: 0.95, offset: 0.35 },
          { transform: 'translate(-50%, -50%) scale(1.4)', opacity: 0 },
        ],
        { duration: ms, easing: 'ease-out' },
      ),
    );
    const count = Math.min(8, 4 + chain);
    for (let n = 0; n < count; n++) {
      const particle = document.createElement('span');
      particle.className = 'flip-particle';
      particle.style.color = color;
      particle.setAttribute('aria-hidden', 'true');
      cell.append(particle);
      nodes.push(particle);
      const angle = (n / count) * Math.PI * 2 + index * 0.3;
      const distance = cell.clientWidth * (0.24 + Math.min(chain, 4) * 0.025);
      animations.push(
        particle.animate(
          [
            { transform: 'translate(-50%, -50%) scale(.4)', opacity: 0 },
            { opacity: 1, offset: 0.28 },
            {
              transform: `translate(calc(-50% + ${Math.cos(angle) * distance}px), calc(-50% + ${Math.sin(angle) * distance}px)) scale(0)`,
              opacity: 0,
            },
          ],
          { duration: ms, easing: 'ease-out' },
        ),
      );
    }
  }
  const cancel = () => animations.forEach((animation) => animation.cancel());
  signal.addEventListener('abort', cancel, { once: true });
  try {
    if (signal.aborted) cancel();
    await Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)));
  } finally {
    signal.removeEventListener('abort', cancel);
    nodes.forEach((node) => node.remove());
  }
}
