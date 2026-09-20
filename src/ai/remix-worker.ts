import { chooseRemix } from './remix-search';
import type { RemixMatch, Player } from '../domain/remix-types';
import type { AiLevel } from './search';
self.onmessage = (
  event: MessageEvent<{
    match: RemixMatch;
    level: AiLevel;
    generation: number;
    version: number;
    ai: Player;
    seed: number;
  }>,
) => {
  const { match, level, generation, version, ai, seed } = event.data;
  if (match.turn !== ai || match.version !== version) return;
  self.postMessage({ generation, version, command: chooseRemix(match, level, { seed }) });
};
