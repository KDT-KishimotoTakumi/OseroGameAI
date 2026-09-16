export interface Replay<T> {
  id: string;
  result: string;
  snapshots: T[];
  date: string;
}
const key = 'jiso.rpg.replays.v1';
export function readReplays<T>(): Replay<T>[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(data)
      ? data
          .filter(
            (x) =>
              x &&
              typeof x.id === 'string' &&
              typeof x.result === 'string' &&
              Array.isArray(x.snapshots) &&
              x.snapshots.length > 0,
          )
          .slice(0, 20)
      : [];
  } catch {
    return [];
  }
}
export function writeReplay<T>(record: Replay<T>): void {
  localStorage.setItem(
    key,
    JSON.stringify([record, ...readReplays<T>().filter((r) => r.id !== record.id)].slice(0, 20)),
  );
}
