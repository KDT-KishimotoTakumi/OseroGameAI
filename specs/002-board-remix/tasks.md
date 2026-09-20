# 実装タスク：盤面組み替えオセロ

更新日：2026-09-19。状態：利用者の実装指示に基づき、31件すべて実装・検証完了。結果は docs/VALIDATION.md を参照。
入力：[要件](spec.md)、[計画](plan.md)、[状態](data-model.md)、[契約](contracts/game.md)。各手順の関連管理資料も同じ変更で更新する。

## 第1段階：準備

- [x] T001 盤面・区画・左右方向・対局・操作・攻撃段階の型と版を `src/domain/remix-types.ts` に定義する。

## 第2段階：共通基盤

条件：T001完了。ここが完了するまで利用者向け機能へ進まない。

- [x] T002 初期16石・両色8合法手・左右回転・4回転で元に戻る・区画外不変・石数不変を `tests/unit/remix-board.test.ts` で確認する失敗するテストを用意する。
- [x] T003 承認された初期配置、区画の座標変換、入力範囲の検査を `src/domain/remix-board.ts` に実装し、T002を成功させる。

## 第3段階：US1 対戦ルール（優先度P1）

目標：2人で回転・連続攻撃・HPの勝負を最後まで遊べる。
独立確認：区画外反転、連鎖、HP0、無攻撃10手、回転制限と例外、終了後の拒否を固定盤面と2人対戦で確認。

- [x] T004 [US1] 複数方向・区画境界越え・同じ石の重複・段階ごとの同時反転・入力不変・有限連鎖の失敗するテストを `tests/unit/remix-capture.test.ts` に作成する。
- [x] T005 [US1] 自石を起点とする挟み方、初回反転、反転石からの連鎖、全段階の結果を `src/domain/remix-capture.ts` に実装し、T004を成功させる。
- [x] T006 [US1] HP0・超過ダメージ・無攻撃9→10・攻撃による回数リセット・同HPの石数判定・完全同点・連続回転の禁止と着手不能時の例外を `tests/unit/remix-match.test.ts` で再現する。
- [x] T007 [US1] 合法操作・純粋な予告計算・確定・HP・無攻撃回数・勝敗・状態版・不正操作と終了後の拒否を `src/domain/remix-match.ts` に実装し、T006を成功させる。
- [x] T008 [US1] 対局開始・選択・確定・世代管理の基礎を `src/application/remix-session.ts` に実装し、入力の二重適用を防ぐ。
- [x] T009 [US1] 4区画の境界、着手・回転モード、区画・方向、決定、HP・手番・回転制限・無攻撃回数と終了結果を `src/presentation/remix-board.ts`、`src/presentation/remix.css`、`src/main.ts` に接続する。
- [x] T010 [US1] 初期16石、左右回転、2人対戦の終局、RPG表示なし、セル寸法固定を `tests/e2e/remix-match.spec.ts` で確認する。

## 第4段階：US2 予告と連鎖演出（優先度P1）

条件：US1完了。目標：結果を確認して操作を決定し、攻撃の広がりを理解できる。
独立確認：予告と確定結果の一致、取消の状態不変、演出順、途中再開始、軽減設定を確認。

- [x] T011 [US2] 選択変更・取消・予告と確定の一致・版の不一致・演出中の二重入力・再開始後の旧結果拒否を `tests/unit/remix-session.test.ts` に追加する。
- [x] T012 [US2] 本番状態と選択・予告を分離し、取消・確定・演出取消と世代／版照合を `src/application/remix-session.ts` に実装してT011を成功させる。
- [x] T013 [US2] 反転予定の石、連鎖段階、合計ダメージ、決定と取消、操作不能の理由を `src/presentation/remix-board.ts` と `src/presentation/remix.css` に表示し、色だけに依存しない記号・文字・キーボード操作を加える。
- [x] T014 [US2] 区画回転→初回反転→各連鎖とHP減少の順に再生する取消可能な演出を `src/presentation/remix-animation.ts` に実装し、演出軽減でも結果を文字表示する。
- [x] T015 [US2] 予告・取消・段階演出・連鎖数・HP・演出途中の新対局・軽減設定を `tests/e2e/remix-preview.spec.ts` で検証する。

## 第5段階：US3 AIと先後交代（優先度P2）

条件：US1・US2完了。独立確認：全難易度で合法な応答、思考上限、古い応答拒否、人とAIの先後交代を確認。

- [x] T016 [US3] 着手・回転・制限例外・終局候補・入力不変・探索打切りと合法代替手を `tests/unit/remix-ai.test.ts` に作成する。
- [x] T017 [US3] 共通の予告計算を使い、HP・連鎖・応答手を評価する3難易度と時間上限、試験用シードを `src/ai/remix-search.ts` に実装する。
- [x] T018 [US3] 世代・状態版・AI色を含む通信を `src/ai/remix-worker.ts` に実装し、`src/application/remix-session.ts` と `src/main.ts` で取消・合法性再検査・失敗時の代替手を接続する。
- [x] T019 [US3] 最初の先手シアン、再戦の先後交代、人とAIの操作色の明示を `src/application/remix-session.ts` と `src/main.ts` に実装する。
- [x] T020 [US3] AI対戦、思考中の新対局、3難易度、連続再戦での人とAIの先後交代を `tests/e2e/remix-ai.spec.ts` で検証する。

## 第6段階：US4 実操作の練習（優先度P2）

条件：US1・US2完了。独立確認：各練習の達成・再試行、通常対局と履歴の不変を確認。

- [x] T021 [US4] 着手・左右回転・予告取消・連続攻撃・HP勝利の練習局面と成功条件を `src/presentation/remix-tutorial.ts` に定義し、`tests/unit/remix-tutorial.test.ts` で共通ルールとの一致を確認する。
- [x] T022 [US4] 操作を促す日本語説明、実操作による達成判定、再試行・次へ・終了を `src/presentation/remix-tutorial.ts` に実装する。
- [x] T023 [US4] 別の練習セッションと通常対局への復帰を `src/main.ts` に接続し、通常のHP・盤面・履歴を変更しない。
- [x] T024 [US4] 全練習の操作・失敗時の再試行・通常対局への復帰・履歴非保存を `tests/e2e/remix-tutorial.spec.ts` で確認する。

## 第7段階：US5 履歴と設定（優先度P2）

条件：US1・US2・US3完了。独立確認：20局上限、全手復元、旧履歴分離、破損・保存失敗、設定・キーボードを確認。

- [x] T025 [US5] 保存版・ルール版、盤面／HP／操作の形式検査、20局上限、旧キー不変、破損データと保存失敗を `tests/unit/remix-replays.test.ts` に作成する。
- [x] T026 [US5] `jiso.remix.replays.v1` の検証・読込・保存と全手の状態復元を `src/infrastructure/remix-replays.ts` に実装する。
- [x] T027 [US5] 履歴表示・前後再生・開始条件と先後を考慮した再戦、効果音・演出軽減・設定保存を `src/main.ts` に接続する。
- [x] T028 [US5] 保存と再読込、全手のHP・盤面再生、旧履歴分離、設定保持、キーボードによる着手・回転・取消を `tests/e2e/remix-history.spec.ts` で検証する。

## 第8段階：統合と完了確認

- [x] T029 新ルールのAI自己対戦を `tools/benchmark-balance.ts` に接続し、操作合法性・1000手以内の終局・思考時間を検証する。1000手をゲームの新しい終了条件にしない。
- [x] T030 型検査・Lint・全単体テスト・本番ビルド・4ブラウザE2E・自己対戦と `specs/002-board-remix/quickstart.md` の確認を行い、画面と応答時間を含む実測結果・制限を `docs/VALIDATION.md` に記録する。
- [x] T031 実装と検証が通った範囲を `docs/GAME.md`、`docs/IMPLEMENTED.md`、`docs/PLAN.md`、`README.md`、`index.html` に反映し、`specs/002-board-remix/tasks.md` の未完了を残さず、未実行を完了扱いにしない。

## 依存と実行方針

T001→T002・T003→US1（T004〜T010）→US2（T011〜T015）→US3（T016〜T020）／US4（T021〜T024）→US5（T025〜T028）→T029〜T031。
各試験は対応する実装前に失敗を確認し、成功してから次の機能へ進む。US3・US4の部品作成はUS2後に別ファイルで並行可能だが、`src/main.ts` の統合は順番に行う。US5の保存部品はUS2後に先行でき、再戦統合はUS3後に行う。各ストーリーのE2Eはそのストーリーの実装完了後に実行する。

独立作業の例：US1のルール試験と画面素材準備、US2後のAI探索と練習課題、US3後の保存形式試験と再戦操作確認。未完成の共通ルールを仮定して同じファイルを同時編集しない。並行実行は必須ではない。

最小の遊べる版はUS1＋US2、依頼全体の完了は全31件。各変更は関連資料の更新を含め、合格した項目だけ `[x]` にする。
