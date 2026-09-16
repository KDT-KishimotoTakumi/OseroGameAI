import { chooseRpg } from './rpg-search';
import type { Match } from '../domain/match';
import type { AiLevel } from './search';
self.onmessage = (event: MessageEvent<{ match: Match; level: AiLevel }>) => {
  self.postMessage(chooseRpg(event.data.match, event.data.level));
};
