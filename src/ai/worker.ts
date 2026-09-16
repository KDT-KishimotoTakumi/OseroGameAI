import { chooseMove, type AiLevel } from './search';
import type { Board } from '../domain/types';

self.onmessage = (event: MessageEvent<{ board: Board; player: 1 | 2; level: AiLevel }>) => {
  const { board, player, level } = event.data;
  self.postMessage({ index: chooseMove(board, player, level) });
};
