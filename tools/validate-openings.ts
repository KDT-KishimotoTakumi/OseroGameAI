import { OPENINGS } from '../src/domain/openings';
import { legalMoves } from '../src/domain/rules';

const unique = new Set(OPENINGS.map((board) => board.join('')));
if (OPENINGS.length !== 8 || unique.size !== 8) throw new Error('開始配置の数または重複が不正です');
for (const board of OPENINGS) {
  if (board.filter((cell) => cell === 1).length !== 4 || board.filter((cell) => cell === 2).length !== 4) throw new Error('石数が不正です');
  if (!legalMoves(board, 1).length || !legalMoves(board, 2).length) throw new Error('合法手がありません');
}
console.log('開始配置8種: 検証成功');
