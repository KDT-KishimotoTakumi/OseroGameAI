# 起動・検証ガイド（実装後に使用）

現時点は設計のみ。以下はT001で用意するコマンドの契約であり、まだ実行できない。
互換性を確認したNode.js LTSとnpmを準備し、プロジェクトルートで実行する。

```powershell
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
npm run preview
```

初回のブラウザ検証には `npx playwright install chromium firefox` を使う。
Chrome/Edge本体は対応チャンネルで確認。Firefox実配布最新版の確認も記録する。

## 合格シナリオ

1. US1: 予約成功、占有失効、反転不可失効、通常パス、双方合法手なし終局を固定局面で検証。
2. US2: 8配置の双方合法手・対称性、AI3段階の完走、離脱時の古いAI応答破棄を検証。
3. US3: 独立モードの4段階を完了・やり直しでき、通常対局履歴に混入しないことを検証。
4. US4: 21局目で最古の結果だけを外す。再現は盤面保持・先後と色交換。保存拒否時も対局継続。
5. 横断: キーボード完走、1280px、幅不足案内、効果音切替、OSとゲーム内の演出軽減を確認。
6. 性能: 前景タブで通常操作30秒を3回測定し平均30fps目標を確認。CPU/GPU・OS・ブラウザ版・画面寸法・設定・最低値も保存。

確認結果は `docs/VALIDATION.md`、戦略的比較は `docs/BALANCE.md` に保存する。
失敗と未実行を区別し、未測定環境の性能や互換性を確認済みとしない。
