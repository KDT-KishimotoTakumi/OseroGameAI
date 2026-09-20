import { legalMoves, scores } from './rules';
import { initialBoard, quadrantCells, rotateQuadrant } from './remix-board';
import { resolveCapture } from './remix-capture';
import {
  other,
  type Player,
  type Quadrant,
  type RemixMatch,
  type RemixCommand,
  type AttackResult,
} from './remix-types';
export function createRemixMatch(firstPlayer: Player = 1, ruleVersion: 1 | 2 = 2): RemixMatch {
  return {
    board: initialBoard(),
    turn: firstPlayer,
    firstPlayer,
    hp: { 1: 50, 2: 50 },
    lastAction: { 1: null, 2: null },
    quiet: 0,
    ply: 0,
    version: 0,
    ruleVersion,
    winner: null,
    endReason: null,
  };
}
export function available(match: RemixMatch): RemixCommand[] {
  if (match.winner !== null) return [];
  const cells = legalMoves(match.board, match.turn);
  if (match.ruleVersion === 2 && cells.length === 0) return [{ kind: 'pass' }];
  const commands: RemixCommand[] = cells.map((index) => ({ kind: 'cell', index }));
  if (match.lastAction[match.turn] !== 'rotate' || cells.length === 0) {
    for (const quadrant of [0, 1, 2, 3] as Quadrant[])
      for (const direction of ['right', 'left'] as const)
        commands.push({ kind: 'rotate', quadrant, direction });
  }
  return commands;
}
export function sameCommand(a: RemixCommand, b: RemixCommand): boolean {
  return (
    a.kind === b.kind &&
    (a.kind === 'cell'
      ? b.kind === 'cell' && a.index === b.index
      : a.kind === 'pass'
        ? b.kind === 'pass'
        : b.kind === 'rotate' && a.quadrant === b.quadrant && a.direction === b.direction)
  );
}
export function simulate(input: RemixMatch, command: RemixCommand): AttackResult {
  if (!available(input).some((candidate) => sameCommand(candidate, command)))
    throw new Error('現在はその操作を選べません');
  const actor = input.turn,
    opponent = other(actor);
  let moved = [...input.board],
    origins: number[];
  if (command.kind === 'cell') {
    moved[command.index] = actor;
    origins = [command.index];
  } else if (command.kind === 'rotate') {
    moved = rotateQuadrant(input.board, command.quadrant, command.direction);
    origins = quadrantCells(command.quadrant).filter((index) => moved[index] === actor);
  } else {
    origins = [];
  }
  const result = resolveCapture(moved, actor, origins),
    next = structuredClone(input);
  next.board = result.board;
  next.hp[opponent] = Math.max(0, input.hp[opponent] - result.damage);
  next.lastAction[actor] = command.kind;
  next.quiet = result.damage ? 0 : input.quiet + 1;
  next.ply++;
  next.version++;
  next.turn = opponent;
  if (next.hp[opponent] === 0) {
    next.winner = actor;
    next.endReason = 'hp';
  } else if (
    next.quiet >= 10 ||
    (command.kind === 'pass' && legalMoves(next.board, opponent).length === 0)
  ) {
    const [cyan, orange] = scores(next.board);
    next.winner =
      next.hp[1] === next.hp[2]
        ? cyan === orange
          ? 0
          : cyan > orange
            ? 1
            : 2
        : next.hp[1] > next.hp[2]
          ? 1
          : 2;
    next.endReason =
      command.kind === 'pass' && legalMoves(next.board, opponent).length === 0
        ? 'blocked'
        : 'quiet';
  }
  return {
    command: structuredClone(command),
    actor,
    moved,
    waves: result.waves,
    damage: result.damage,
    next,
  };
}
export function commit(
  match: RemixMatch,
  command: RemixCommand,
  expectedVersion: number,
): AttackResult {
  if (match.version !== expectedVersion)
    throw new Error('盤面が更新されました。操作を選び直してください');
  return simulate(match, command);
}
