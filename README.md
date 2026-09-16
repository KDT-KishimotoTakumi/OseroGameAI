# 時層リバーシ RPG
4英雄・地形・クエストを備えた2色の盤面ゲーム。敵襲イベントと未来予約は廃止済み。
## 起動
Node.js 22.12以上を使用。プロジェクトルートで以下を実行する。
```powershell
npm install
npm run dev
```
表示されたローカルURLをChrome、Edge、Firefoxで開く。
## 検証
```powershell
npm test
npm run lint
npm run build
npm run validate:openings
npm run benchmark
npm run test:e2e
```
ブラウザ未導入なら `npx playwright install chromium firefox`。Chrome・Edgeは端末へ導入済みのものを使用。
## 資料
- [遊び方・現行仕様](docs/GAME.md)
- [実装と検証状況](docs/RPG_STATUS.md)
- [インタビュー](docs/INTERVIEW.md)
- [タスク](specs/001-time-layer-reversi/tasks.md)
- [開発規約](PROAGENTS.md)
- [Spec Kit導入](docs/SPECKIT_SETUP.md)
