import { chooseMove, type AiLevel } from './search';
import type { ClassicMatch, ClassicCommand } from '../domain/classic-match';
self.onmessage = (event: MessageEvent<{ match: ClassicMatch; level: AiLevel }>) => {
  const index = chooseMove(event.data.match.board, event.data.match.turn, event.data.level);
  const command: ClassicCommand = index === null ? { kind: 'pass' } : { kind: 'cell', index };
  self.postMessage(command);
};
