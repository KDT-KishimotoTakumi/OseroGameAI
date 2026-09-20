# 実装計画：盤面組み替えオセロ

2026-09-20追補：着手不能時の自動パスと進行速度は [修正要件](pass-pace.md) を正とする。

更新日：2026-09-19。対象：`002-board-remix`。入力：[確定要件](spec.md)。状態：全31タスクの実装・検証が完了。

## 概要

既存Webアプリを、区画回転・連続反転・HP戦闘を共通ルールで扱う対局へ切り替える。通常オセロの暫定版は実装開始まで維持する。最初にルールと2人対戦を完成させ、予告と演出、AI、練習、履歴・設定の順で統合する。

## 技術条件

- TypeScript 6.0.3、Vite 8.3.0、Node.js 22.12以上。既存ロックファイルを維持し、新しいフレームワークを追加しない。
- 対象：デスクトップのChromium・Firefox・Chrome・Edge、横幅1280px以上を基本とする既存Web画面。
- 保存：localStorage。新ルール専用の版付き保存キー。サーバー・外部APIは不要。
- 検証：Vitest、Playwright、型検査、ESLint、本番ビルド、AI自己対戦。
- 応答性：ルール計算は64マスの有限処理。AIはWorker、標準800ms・上級1800ms以内で合法な代替手を返す設計。予告の応答と描画を実測する。
- 規模：1端末・1対局・履歴20局。オンライン対戦は対象外。

## 憲章・規約への適合確認

要件とタスク作成前の確認は取得済み。UI・AI・練習・再生は同じ純粋なルールを利用する。乱数を使うAIは試験でシードを指定できるようにする。資料を日本語で更新し、過去のRPG実績と現在の実装を区別する。設計後も違反・未解決の核となる仕様なし。実装開始は「タスクを行ってください」で承認済み。

## 設計判断

[research.md](research.md) に方式比較、[data-model.md](data-model.md) に状態、[contracts/game.md](contracts/game.md) にルールとUI・Workerの契約、[quickstart.md](quickstart.md) に動作確認を記録する。

## 配置予定

```text
src/domain/remix-types.ts      状態・操作・攻撃結果の型
src/domain/remix-board.ts      初期16石・区画回転
src/domain/remix-capture.ts    挟み方と連鎖の計算
src/domain/remix-match.ts      合法操作・HP・終了・確定
src/application/remix-session.ts  選択・確定・演出取消・先後管理
src/ai/remix-search.ts         HPと連鎖を考慮する探索
src/ai/remix-worker.ts         版番号付きWorker契約
src/presentation/remix-board.ts   盤面・操作・予告表示
src/presentation/remix-animation.ts  回転・段階的反転・HP演出
src/presentation/remix-tutorial.ts   実操作の練習
src/presentation/remix.css     4区画の境界・予告・HP表示
src/infrastructure/remix-replays.ts  保存形式検証・履歴
src/main.ts                   各機能の接続
tests/unit/remix-*.test.ts     ルール・取消・保存・AI
tests/e2e/remix-*.spec.ts      利用者操作と4ブラウザ確認
```

既存の反転アニメーション・音声・設定は再利用する。旧ドメインを予告や新対局へ混ぜない。上記は作成予定であり、空の実装ファイルを先に生成しない。

## 実装順と確認ゲート

1. 共通型・初期配置・区画移動と挟み判定の基盤。
2. US1：連鎖、HP、無攻撃カウント、合法操作、2人対戦。境界条件の試験が通るまで次へ進まない。
3. US2：予告・取消・確定と段階的演出。予告と本番結果が一致することを確認。
4. US3・US4・US5：AIと先後交代、練習、版付き履歴を統合。
5. 4ブラウザ、保存復旧、終局保証、本番ビルド、管理資料を確認して完了扱いにする。

最小の遊べる版はUS1＋US2。依頼全体の完了には全機能が必要。タスク間の依存は [tasks.md](tasks.md) に記録する。
