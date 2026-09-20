import type { Board } from './types';
export type Player = 1 | 2;
export type Quadrant = 0 | 1 | 2 | 3;
export type Direction = 'right' | 'left';
export type RemixCommand =
  | { kind: 'cell'; index: number }
  | { kind: 'rotate'; quadrant: Quadrant; direction: Direction }
  | { kind: 'pass' };
export interface RemixMatch {
  board: Board;
  turn: Player;
  firstPlayer: Player;
  hp: Record<Player, number>;
  lastAction: Record<Player, 'cell' | 'rotate' | 'pass' | null>;
  quiet: number;
  ply: number;
  version: number;
  ruleVersion: 1 | 2;
  winner: 0 | Player | null;
  endReason: 'hp' | 'quiet' | 'blocked' | null;
}
export interface AttackResult {
  command: RemixCommand;
  actor: Player;
  moved: Board;
  waves: number[][];
  damage: number;
  next: RemixMatch;
}
export const other = (player: Player): Player => (player === 1 ? 2 : 1);
