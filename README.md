# リミックス・オセロ

4×4区画を回し、連続反転で相手のHPを削るWebゲーム。2人対戦・3難易度のAI・実操作の練習・全手リプレイを利用できます。

## 起動

Node.js 22.12以上。プロジェクトルートで実行します。

```powershell
npm install
npm run dev
```

表示されたURLをChrome、Edge、Firefoxで開きます。白点のマス、または区画と回転方向を選び、予告を確認して「攻撃を決定」。初めてなら「練習モード」から始めてください。

手番の案内は中央に2秒表示します。置けるマスがない番は自動でパスし、双方とも置けない場合は残りHP→石数で終了します。

音楽は最初のクリック・キー操作後に始まります。「演出設定」でBGMと効果音を個別に切り替え、音量を調整できます。反転時には光の輪と粒子が表示されます。控えめにしたい場合は「演出軽減」を選んでください。

## 検証

```powershell
npm run typecheck
npm run lint
npm test
npm run test:coverage
npm run build
npm run benchmark
npm run test:e2e
```

`npm run test:coverage` は現行ルールの単体テスト対象に、文・分岐・関数・行数の各90%以上を必須とします。画面・Workerを含む操作経路は `npm run test:e2e` でChromium、Firefox、Chrome、Edgeの4ブラウザを確認します。

ブラウザ未導入なら `npx playwright install chromium firefox`。Chrome・Edgeは端末に導入済みのものを利用。`validate:openings` は旧ルール資料の検証です。

## 資料

- [遊び方](docs/GAME.md)
- [実装状況](docs/IMPLEMENTED.md)・[検証](docs/VALIDATION.md)・[予定](docs/PLAN.md)
- [インタビュー](docs/INTERVIEW_BOARD_REMIX.md)
- [要件](specs/002-board-remix/spec.md)・[計画](specs/002-board-remix/plan.md)・[タスク](specs/002-board-remix/tasks.md)
- [規約](PROAGENTS.md)・[Spec Kit導入](docs/SPECKIT_SETUP.md)
