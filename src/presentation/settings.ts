const MOTION_KEY = 'jiso-reversi.reduced-motion';
export function reducedMotion(): boolean {
  const stored = localStorage.getItem(MOTION_KEY);
  return stored === 'on' || (stored !== 'off' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
export function toggleReducedMotion(): boolean {
  const next = !reducedMotion(); localStorage.setItem(MOTION_KEY, next ? 'on' : 'off'); document.documentElement.classList.toggle('reduced-motion', next); return next;
}
