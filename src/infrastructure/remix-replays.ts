import type { RemixMatch, RemixCommand } from '../domain/remix-types';
import { createRemixMatch, simulate } from '../domain/remix-match';
export const REPLAY_KEY = 'jiso.remix.replays.v1';
let cachedRaw: string | null | undefined;
let cachedRecords: RemixReplay[] = [];
export interface RemixFrame {
  match: RemixMatch;
  command?: RemixCommand;
  waves?: number[][];
  damage?: number;
}
export interface RemixReplay {
  id: string;
  date: string;
  result: string;
  schemaVersion: 1;
  ruleVersion: 1 | 2;
  mode: 'local' | 'ai';
  frames: RemixFrame[];
}
function equal(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
export function validReplay(value: unknown): value is RemixReplay {
  try {
    const replay = value as RemixReplay;
    if (
      !replay ||
      typeof replay.id !== 'string' ||
      typeof replay.date !== 'string' ||
      typeof replay.result !== 'string' ||
      replay.schemaVersion !== 1 ||
      (replay.ruleVersion !== 1 && replay.ruleVersion !== 2) ||
      !['local', 'ai'].includes(replay.mode) ||
      !Array.isArray(replay.frames) ||
      !replay.frames.length ||
      replay.frames.length > 1001
    )
      return false;
    const first = replay.frames[0].match.firstPlayer;
    if (first !== 1 && first !== 2) return false;
    let previous = createRemixMatch(first, replay.ruleVersion);
    if (!equal(replay.frames[0].match, previous)) return false;
    for (const frame of replay.frames.slice(1)) {
      if (!frame.command) return false;
      const result = simulate(previous, frame.command);
      if (
        !equal(frame.match, result.next) ||
        !equal(frame.waves, result.waves) ||
        frame.damage !== result.damage
      )
        return false;
      previous = result.next;
    }
    return true;
  } catch {
    return false;
  }
}
export function readRemixReplays(): RemixReplay[] {
  try {
    const raw = localStorage.getItem(REPLAY_KEY);
    if (raw === cachedRaw) return cachedRecords;
    const data: unknown = JSON.parse(raw ?? '[]');
    cachedRecords = Array.isArray(data) ? data.slice(0, 20).filter(validReplay) : [];
    cachedRaw = raw;
    return cachedRecords;
  } catch {
    return [];
  }
}
export function saveRemixReplay(replay: RemixReplay): void {
  if (!validReplay(replay)) throw new Error('履歴形式が不正です');
  localStorage.setItem(
    REPLAY_KEY,
    JSON.stringify(
      [replay, ...readRemixReplays().filter((record) => record.id !== replay.id)].slice(0, 20),
    ),
  );
}
