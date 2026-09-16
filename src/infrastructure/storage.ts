export type MatchRecord = { version: 1; date: string; cyan: number; orange: number; result: string; seed?: number };
const KEY = 'jiso-reversi.matches';
export function loadMatches(): MatchRecord[] {
  try { const value = JSON.parse(localStorage.getItem(KEY) ?? '[]') as MatchRecord[]; return Array.isArray(value) ? value.filter((item) => item?.version === 1) : []; } catch { return []; }
}
export function saveMatch(record: MatchRecord): void {
  const next = [{ ...record, version: 1 as const }, ...loadMatches()].slice(0, 20);
  localStorage.setItem(KEY, JSON.stringify(next));
}
