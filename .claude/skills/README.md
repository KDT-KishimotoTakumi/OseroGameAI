# 導入済みAgent Skills（Claude Code用）

導入日：2026-11-10。コピー元：[KDT-KishimotoTakumi/AI-Development-Skills](https://github.com/KDT-KishimotoTakumi/AI-Development-Skills)。
本文は無改変（改行のみLF）。コピー元 `sources.lock.json` のSHA-256と全ファイル一致を確認済み。

| スキル | このプロジェクトでの用途 |
|---|---|
| context-engineering | 作業開始時に `AGENTS.md`→`PROAGENTS.md`→必要な `docs/` だけを読む |
| test-driven-development | ルール・AI・ガイド変更時に Vitest で Red→Green→Refactor（PROAGENTS.md 6章） |
| debugging-and-error-recovery | 単体・E2E失敗、ビルド失敗の再現と原因調査 |
| code-review-and-quality | 変更のレビュー（正しさ・設計・安全性・性能） |
| code-simplification | 挙動を保ったリファクタリング |

補助資料は `.claude/references/`（スキル本文の `../../references/` から参照）。

## 導入しなかったもの

- `cpp-coding-standards` / `cpp-testing`：C++用。本プロジェクトは TypeScript/Vite。
- `context-mode`：別途MCP実行環境とnpmパッケージ導入が必要で、Elastic License 2.0。必要になった時点で検討する。

## 出典・ライセンス

5スキルと references は [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills/tree/8bfcc1f9916f2eea55494d8c1fa7f4bde867dd9e)（MIT）。原文は [../licenses/agent-skills.LICENSE](../licenses/agent-skills.LICENSE)。
利用者の指示と `PROAGENTS.md` の規約をスキルの例より優先する。
