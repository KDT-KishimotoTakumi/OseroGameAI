import { createRemixMatch, simulate, commit } from '../domain/remix-match';
import {
  other,
  type RemixMatch,
  type RemixCommand,
  type AttackResult,
  type Player,
} from '../domain/remix-types';
export class RemixSession {
  match: RemixMatch = createRemixMatch();
  selection: AttackResult | null = null;
  generation = 0;
  busy = false;
  mode: 'local' | 'ai' = 'local';
  human: Player = 1;
  select(command: RemixCommand) {
    if (this.busy) throw new Error('演出・思考の完了をお待ちください');
    this.selection = simulate(this.match, command);
    return this.selection;
  }
  cancel() {
    this.selection = null;
  }
  confirm(): AttackResult {
    if (this.busy || !this.selection) throw new Error('操作を選んでください');
    const result = commit(this.match, this.selection.command, this.selection.next.version - 1);
    this.match = result.next;
    this.selection = null;
    this.busy = true;
    return result;
  }
  valid(generation: number, version: number) {
    return generation === this.generation && version === this.match.version;
  }
  finish(generation: number, version: number) {
    if (this.valid(generation, version)) this.busy = false;
  }
  interrupt() {
    this.generation++;
    this.busy = false;
    this.selection = null;
  }
  start(mode = this.mode, rematch = false, initialFirst = this.match.firstPlayer) {
    this.interrupt();
    this.mode = mode;
    const first = rematch ? other(initialFirst) : 1;
    this.match = createRemixMatch(first);
    this.human = 1;
  }
}
