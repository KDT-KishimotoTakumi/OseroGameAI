# GitHub Spec Kit / Hermes 導入・運用手順

最終更新: 2026-09-16

## 目的と前提

プロジェクトのルート（カレントディレクトリ）へGitHub Spec Kitを導入し、Hermes Agentの `speckit-*` スキル＝スラッシュコマンドとして使う。
以下は利用者指定の手順。別の導入方式に勝手に変更しない。パスは環境から動的に解決し、端末固有の絶対パスをコマンドに埋め込まない。

## 手順1: Specify CLI

```powershell
uv tool install --from git+https://github.com/github/spec-kit.git specify-cli
specify --version
```

バージョンが返れば成功。失敗時は `uv --version` でuvの有無を確認し、なければ `pip install uv` 後に再試行する。
今回uvは導入済み。キャッシュ書き込みが制限されたため、承認を得て同じインストールコマンドを再実行した。

uvの実行ファイル配置先がPATHにない場合は、現在のPowerShellセッションへ動的に追加する。

```powershell
$toolBin = (uv tool dir --bin).Trim()
$env:PATH = $toolBin + [IO.Path]::PathSeparator + $env:PATH
specify --version
```

この追加は現在のプロセス限り。新しいターミナルでも必要なら同じ処理を行う。

## 手順2: プロジェクト初期化

プロジェクトルートで実行する。

```powershell
specify init --here --integration hermes --force --non-interactive
```

- `--no-git` は指定しない（利用者指定手順では存在しないオプション）。
- `.specify/` にテンプレート・PowerShellスクリプト群、`.hermes/skills/` に空のマーカーディレクトリが作られる。
- Next Stepsなどに `speckit-*` コマンドが表示される。
- CLI内蔵のHermes公式統合がスキルを生成する。自前で `SKILL.md` を書かない。
- スキルの生成先は `~/.hermes/skills/`。プロジェクト内の空ディレクトリはスキル本体ではない。

## 手順3: 実際のスキル配置先へコピー（必須）

コピー先は以下の優先順で解決する。

1. `HERMES_HOME` があれば、その配下の `skills/`。
2. なければ `hermes config path` の出力にある `config.yaml` の親の `skills/`。
3. それも不明なら `~/.hermes/skills/`。

コピー元はPythonで `os.path.expanduser("~/.hermes/skills")` として解決する。
`speckit-*` ディレクトリだけをコピーし、コピー先の既存同名ディレクトリは置換する。
実行用Pythonは [install-speckit-skills.py](../tools/install-speckit-skills.py) に保存した。
指定されたPython処理に、削除先が解決済みskills配下であることの確認と、コピー元＝先の場合の自己削除防止を追加している。スキル本文は改変しない。

```powershell
$pythonExe = (uv python find).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Pythonの解決に失敗' }
& $pythonExe tools/install-speckit-skills.py
```

スクリプトの `dst_root:` 出力が実際の配置先。ユーザー領域への書き込み権限が必要。

## 手順4: 全項目の検証

### 1. Hermesから認識されること

```powershell
hermes skills list
```

次の10個がすべて `enabled` であることを確認する。

`speckit-analyze` / `speckit-checklist` / `speckit-clarify` / `speckit-constitution` / `speckit-converge` / `speckit-implement` / `speckit-plan` / `speckit-specify` / `speckit-tasks` / `speckit-taskstoissues`

表示されない場合は手順3の配置先を再確認する。今回、一覧取得時の内部管理ディレクトリ `.hub` 作成にも権限が必要だったため、承認を得て同じコマンドを再実行した。

### 2. プレースホルダーが展開されていること

`dst_root` 配下の各 `speckit-*/SKILL.md` に `{SCRIPT}` / `{ARGS}` / `__SPECKIT_COMMAND_*__` / `__AGENT__` が残っていないこと。残る場合は手順2からやり直す。

### 3. OSに合ったスクリプトであること

Windowsでは `.specify/scripts/powershell/*.ps1`、Linux/macOSでは `.specify/scripts/bash/*.sh` がスキル本文に埋め込まれていること。異なるOS版なら初期化のvariant選択を確認する。

今回の公式 `1.0.8.dev0` では9スキルにPowerShell参照があり、bash参照は0件。`speckit-specify` は機能ディレクトリと `.specify/feature.json` の作成を直接指示する方式で、スクリプト参照自体がない。10スキルすべてにPowerShell参照があるという結果ではない。公式生成内容を保持した。

### 4. 統合登録

`.specify/integration.json` の `installed_integrations` に `hermes` があること。

### 5. 前提スクリプトの起動

プロジェクトルートで実行する。Windows:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .specify/scripts/powershell/check-prerequisites.ps1 -Json
```

Linux/macOS:

```bash
bash .specify/scripts/bash/check-prerequisites.sh --json
```

機能未作成時は `Feature directory not found` 系エラーが正常な確認結果。終了コードだけで導入失敗と判断せず、スクリプトが起動して想定の診断を返したことを確認する。

## 今回の結果

| 確認 | 結果 |
| --- | --- |
| CLI | `specify 1.0.8.dev0` |
| インストール元コミット | `319fb84f5a6dc8db1cd8558e0a5504948b6ca2ea` |
| 初期化 | 成功、`Selected script type: ps` |
| コピー先 | `HERMES_HOME/skills`（環境変数から解決、config pathとも一致） |
| スキル | 指定10個すべてenabled |
| 指定の未処理プレースホルダー | 全10ファイルで0件 |
| PowerShell版 | 9スキルに参照、specifyは直接作成方式、bash参照0件 |
| 統合登録 | `installed_integrations: ["hermes"]`、scriptは `ps` |
| 前提スクリプト | 起動成功。`ERROR: Feature directory not found. Set SPECIFY_FEATURE_DIRECTORY or run the specify command to create .specify/feature.json.`（終了コード1、機能未作成の想定結果） |

## 使い方と運用

基本順序（括弧内は任意）:

`/speckit-constitution` → `/speckit-specify` → (`/speckit-clarify`) → `/speckit-plan` → (`/speckit-checklist`) → `/speckit-tasks` → (`/speckit-analyze`) → `/speckit-implement`

- `/speckit-converge`: コードベースを評価して残作業をタスクへ追加。
- `/speckit-taskstoissues`: タスクのIssue化。外部への作成は利用者から指示された場合に実行する。
- スキルは次回Hermesセッションから有効。既存セッションでは `/reset` が必要。
- プロジェクト側に `.specify/` がない状態で実行しない。すべてのスキルがこの構成を前提とする。
- 空の `.hermes/skills/` はGitに保存されない。別環境では導入手順を実行してスキルとマーカーを用意する。
- constitution作成時は `PROAGENTS.md` の規約と整合させる。今回の導入ではゲーム仕様や憲章本文は未確定。
- コンテキスト節約のため、この資料や全スキルの本文を毎回読み込まない。導入・復旧時や対象コマンド利用時に必要な部分だけ参照する。
