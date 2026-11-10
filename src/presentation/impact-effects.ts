import { comboLabel, shakeAmplitude, type ImpactProfile } from './impact-profile';

/**
 * 追加演出（衝撃波・閃光・COMBO表示・揺れ・勝利演出）。
 * 盤面は演出の各段階で再描画されるため、body直下の固定レイヤーに重ねて描画する。
 * すべて既存の演出時間 ms 以内で終わり、対局の進行を待たせない。中断時は即座に消す。
 */
const color = (player: number) => (player === 1 ? '#79f5ff' : '#ffc084');

function layer(): HTMLElement {
  let node = document.getElementById('impact-layer');
  if (!node) {
    node = document.createElement('div');
    node.id = 'impact-layer';
    node.setAttribute('aria-hidden', 'true');
    document.body.append(node);
  }
  return node;
}

function own(nodes: HTMLElement[], animations: Animation[], signal: AbortSignal) {
  const cleanup = () => {
    animations.forEach((animation) => animation.cancel());
    nodes.forEach((node) => node.remove());
  };
  if (signal.aborted) {
    cleanup();
    return;
  }
  signal.addEventListener('abort', cleanup, { once: true });
  void Promise.all(animations.map((animation) => animation.finished.catch(() => undefined))).then(
    () => {
      signal.removeEventListener('abort', cleanup);
      nodes.forEach((node) => node.remove());
    },
  );
}

function spawn(className: string, rect: { x: number; y: number; w: number; h: number }) {
  const node = document.createElement('span');
  node.className = className;
  node.style.cssText = `left:${rect.x}px;top:${rect.y}px;width:${rect.w}px;height:${rect.h}px;`;
  layer().append(node);
  return node;
}

function unionRect(root: HTMLElement, indices: number[]) {
  const rects = indices
    .map((index) => root.querySelector(`[data-index="${index}"]`)?.getBoundingClientRect())
    .filter((rect): rect is DOMRect => !!rect);
  if (!rects.length) return null;
  const left = Math.min(...rects.map((rect) => rect.left)),
    top = Math.min(...rects.map((rect) => rect.top)),
    right = Math.max(...rects.map((rect) => rect.right)),
    bottom = Math.max(...rects.map((rect) => rect.bottom));
  return { left, top, width: right - left, height: bottom - top, cell: rects[0].width };
}

/** 着手マス、または回転した区画を中心に広がる衝撃波。 */
export function playShockwave(
  root: HTMLElement,
  indices: number[],
  player: number,
  profile: ImpactProfile,
  ms: number,
  signal: AbortSignal,
): void {
  const area = unionRect(root, indices);
  if (!area || signal.aborted) return;
  const size = Math.max(area.width, area.height, area.cell);
  const cx = area.left + area.width / 2,
    cy = area.top + area.height / 2;
  const box = { x: cx - size / 2, y: cy - size / 2, w: size, h: size };
  const nodes: HTMLElement[] = [],
    animations: Animation[] = [];
  const reach = indices.length > 1 ? profile.shockwaveScale * 0.55 : profile.shockwaveScale;
  for (let ring = 0; ring < 2; ring++) {
    const node = spawn('impact-wave', box);
    node.style.color = color(player);
    nodes.push(node);
    animations.push(
      node.animate(
        [
          { transform: 'scale(.2)', opacity: 0 },
          { transform: 'scale(.45)', opacity: 1, offset: 0.12 },
          { transform: `scale(${reach})`, opacity: 0 },
        ],
        {
          duration: ms * (0.7 - ring * 0.15),
          delay: ring * ms * 0.12,
          easing: 'cubic-bezier(.1,.7,.3,1)',
        },
      ),
    );
  }
  const core = spawn('impact-core', box);
  core.style.color = color(player);
  nodes.push(core);
  animations.push(
    core.animate(
      [
        { transform: 'scale(.3)', opacity: profile.flashOpacity + 0.3 },
        { transform: 'scale(1)', opacity: 0 },
      ],
      { duration: ms * 0.45, easing: 'ease-out' },
    ),
  );
  own(nodes, animations, signal);
}

/** 画面（ゲーム全体）の揺れ。transformは寸法計測に誤差を生むため、相対位置だけを動かす。 */
export function shake(target: HTMLElement, amplitude: number, ms: number, signal: AbortSignal) {
  if (amplitude <= 0 || signal.aborted) return;
  const steps = 8;
  const frames = Array.from({ length: steps + 1 }, (_, step) => {
    const decay = 1 - step / steps,
      sign = step % 2 ? -1 : 1;
    const x = step === steps ? 0 : sign * amplitude * decay,
      y = step === steps ? 0 : -sign * amplitude * 0.45 * decay * (step % 3 ? 1 : -1);
    return { left: `${Math.round(x)}px`, top: `${Math.round(y)}px` };
  });
  const animation = target.animate(frames, { duration: Math.min(ms, 520), easing: 'linear' });
  // 揺れで一瞬だけ横幅を超えるため、揺れている間だけ横スクロールバーを出さない。
  shaking++;
  document.documentElement.classList.add('impact-shaking');
  const release = () => {
    shaking = Math.max(0, shaking - 1);
    if (!shaking) document.documentElement.classList.remove('impact-shaking');
  };
  void animation.finished.catch(() => undefined).then(release);
  own([], [animation], signal);
}
let shaking = 0;

/** 連鎖ごとの盤面閃光・COMBO表示・揺れ。連鎖が伸びるほど強くなる。 */
export function playChainImpact(
  root: HTMLElement,
  chain: number,
  damage: number,
  player: number,
  profile: ImpactProfile,
  ms: number,
  signal: AbortSignal,
): void {
  const board = root.querySelector('.board')?.getBoundingClientRect();
  if (!board || signal.aborted) return;
  const rect = { x: board.left, y: board.top, w: board.width, h: board.height };
  const nodes: HTMLElement[] = [],
    animations: Animation[] = [];
  const flash = spawn('impact-flash', rect);
  flash.style.color = color(player);
  nodes.push(flash);
  const strength = Math.min(1, profile.flashOpacity * (0.7 + chain * 0.2));
  animations.push(
    flash.animate([{ opacity: 0 }, { opacity: strength, offset: 0.15 }, { opacity: 0 }], {
      duration: ms * 0.6,
      easing: 'ease-out',
    }),
  );
  const label = comboLabel(chain);
  if (label) {
    // 盤面の一部が画面外でも文字が切れないよう、見えている範囲の中央に出す。
    const top = Math.max(0, board.top),
      bottom = Math.min(window.innerHeight, board.bottom);
    const combo = spawn('impact-combo', {
      x: board.left,
      y: top,
      w: board.width,
      h: Math.max(0, bottom - top),
    });
    combo.textContent = label;
    combo.style.color = color(player);
    combo.style.fontSize = `${Math.min(96, 46 + chain * 10) * (profile.shockwaveScale / 3.2 + 0.4)}px`;
    nodes.push(combo);
    animations.push(
      combo.animate(
        [
          { transform: 'scale(2.4) rotate(-6deg)', opacity: 0 },
          { transform: 'scale(.92) rotate(-6deg)', opacity: 1, offset: 0.18 },
          { transform: 'scale(1) rotate(-6deg)', opacity: 1, offset: 0.7 },
          { transform: 'scale(1.15) rotate(-6deg)', opacity: 0 },
        ],
        { duration: ms, easing: 'ease-out' },
      ),
    );
  }
  own(nodes, animations, signal);
  shake(root, shakeAmplitude(profile, chain, damage), ms, signal);
}

/** 勝利時の大きな閃光・連続衝撃波・強い揺れ。勝敗バナーがあればそこを中心にする。 */
export function playVictory(
  root: HTMLElement,
  winner: number,
  profile: ImpactProfile,
  ms: number,
  signal: AbortSignal,
): void {
  const board = (
    root.querySelector('.victory-banner') ?? root.querySelector('.board')
  )?.getBoundingClientRect();
  if (!board || signal.aborted) return;
  const duration = Math.max(ms, 900);
  const size = Math.min(Math.max(board.width, board.height), 760);
  const box = {
    x: board.left + board.width / 2 - size / 2,
    y: board.top + board.height / 2 - size / 2,
    w: size,
    h: size,
  };
  const nodes: HTMLElement[] = [],
    animations: Animation[] = [];
  const flash = spawn('impact-flash impact-victory', {
    x: board.left,
    y: board.top,
    w: board.width,
    h: board.height,
  });
  flash.style.color = color(winner);
  nodes.push(flash);
  animations.push(
    flash.animate(
      [
        { opacity: 0 },
        { opacity: Math.min(1, profile.flashOpacity + 0.35), offset: 0.1 },
        { opacity: 0 },
      ],
      {
        duration,
        easing: 'ease-out',
      },
    ),
  );
  for (let ring = 0; ring < 3; ring++) {
    const node = spawn('impact-wave', box);
    node.style.color = color(winner);
    nodes.push(node);
    animations.push(
      node.animate(
        [
          { transform: 'scale(.1)', opacity: 0 },
          { transform: 'scale(.3)', opacity: 1, offset: 0.1 },
          { transform: `scale(${0.7 + profile.shockwaveScale * 0.25})`, opacity: 0 },
        ],
        {
          duration: duration * 0.8,
          delay: ring * duration * 0.1,
          easing: 'cubic-bezier(.1,.7,.3,1)',
        },
      ),
    );
  }
  own(nodes, animations, signal);
  shake(root, profile.victoryShakePx, duration, signal);
}
