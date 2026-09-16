export type Cell = 0 | 1 | 2;
export type Board = Cell[];
export type Action =
  | { kind: 'place'; index: number }
  | { kind: 'reserve'; index: number }
  | { kind: 'pass' };
export type Event = { kind: 'placed' | 'reserved' | 'resolved' | 'expired' | 'passed' | 'end'; text: string; index?: number };
export type Pending = (number | null)[];
export interface GameState {
  board: Board;
  turn: 1 | 2;
  remaining: [number, number, number];
  pending: Pending;
  status: 'playing' | 'finished';
  version: number;
  events: Event[];
}
