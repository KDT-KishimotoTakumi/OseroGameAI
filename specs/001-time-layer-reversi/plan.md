# 実装計画: 時層リバーシ

## 現行版への移行
未来予約の廃止とRPG拡張により、現行仕様は [RPG拡張](rpg-extension.md)、実装タスクは [tasks.md](tasks.md) を正本とする。以下の旧未来予約仕様・計画は過去の記録。

作成日: 2026-09-16。状態: 設計完了、実装未着手。
仕様: [spec.md](spec.md)。機能ID: `001-time-layer-reversi`。実際のGitブランチ: `main`。
利用者の「タスク作成に進めてください」により、タスク作成前の確認条件を充足。

## 概要

純粋なルール処理、DOM/CSS/SVGの画面、別スレッドのAIから構成する静的Webアプリ。
同一端末対局で予約ルールを検証し、AI、独立チュートリアル、結果保存を追加する。

## 技術背景

| 項目 | 選定 |
| --- | --- |
| 言語・構築 | TypeScript（strict）、Vite、npm。互換性のあるNode.js LTSと依存版をT001で固定 |
| 画面 | UIフレームワークなし。DOM、CSS、SVG、日本語、1280px以上、通常時30fps目標 |
| AI | 専用Web Worker、反復深化とαβ探索。探索予算0.3/1/2秒 |
| 保存・音 | localStorage、Web Audioによる自作効果音 |
| 検証 | Vitest、Playwright、実Chrome/Edge/Firefox確認 |
| 規模 | 64マス、開始配置8種、3モード、結果20件、外部画像・サーバーなし |

根拠と代替は [research.md](research.md)。詳細契約は [data-model.md](data-model.md) と [画面・内部契約](contracts/interfaces.md)。

## 憲章との整合

- 調査前: 要件要約を提示済み。利用者によるタスク作成の明示承認あり。
- 設計後: ルールをUI/AIで共有し、非同期処理の寿命を管理。日本語記録、必要資料だけの参照、独立検証を維持。
- 品質上の残課題: 予約の戦略的価値と開始配置の公平性は、実装時の検証対象。達成済みとはしない。
- 憲章違反の例外: なし。合意済みルールの変更が必要なら根拠を示して利用者に確認する。

## 構成

```text
src/
  main.ts
  domain/             型、合法手、予約、終局、開始配置
  application/        対局進行、モード、再戦、チュートリアル
  ai/                 評価、探索、Worker
  presentation/       画面、盤面、入力、スタイル
  infrastructure/     保存、効果音、乱数
tests/
  unit/               ルール、AI、保存
  integration/        対局進行、非同期処理
  e2e/                ブラウザ操作
tools/                配置とバランス検証
docs/                 概要、進捗、素材、検証結果
specs/001-time-layer-reversi/
  spec.md / plan.md / research.md / data-model.md
  contracts/ / quickstart.md / tasks.md / checklists/
```

## 工程

環境 → 共通基盤 → US1予約対局 → US2配置とAI → US3チュートリアル → US4保存・再戦 → 横断検証。
US3/US4の独立部分はUS1の後で並行可能。詳細依存はtasks.mdを正本とする。

## 複雑さと検証上の注意

予約は設定と解決で合計2手番を使う。通常手より有利な局面があるかT041で検証する。
対称性だけでは先手の公平性を保証しない。構造検査と同じ条件での対戦比較を分ける。
探索予算とブラウザのスケジュール遅延を含む応答時間は別々に記録する。
30fps測定ではCPU/GPU・ブラウザ版・画面寸法を記録し、未測定環境に一般化しない。
