---
title: 実行とデバッグ（launch.json）
category: ワークスペースツール
order: 91
summary: VS Code の起動構成を Gitcito から離れずに実行する。
keywords: launch.json run 実行 debug デバッグ vscode configs 構成 設定 tasks タスク preLaunchTask input background バックグラウンド 起動
---

# 実行とデバッグ

Gitcito はあなたの `.vscode/launch.json` を読み — ルートのものも、入れ子になった
ものも、区切り線でグループ分けして — 選んだ構成を統合ターミナルで実行します。

![起動構成のピッカーとフローティングツールバー](../../screenshots/launch-configs.webp)

- VS Code の**変数は解決されます**（`${workspaceFolder}` とその仲間）。
- 構成の **`preLaunchTask`** が先に走ります。
- **`${input:…}`** の値は起動前に対話的に尋ねられます（`promptString` と
  `pickString`）。
- **`isBackground`** のタスク（ウォッチャー、開発サーバー）はデタッチして走るので、
  起動をブロックすることはありません。

フローティングツールバーから **一時停止 / 再開、再起動、停止** ができ、実行中の
セッションを切り替えられます。

**設定 → 一般 → launch.json を有効にする** でオンにします。**実行** ボタンが Git /
ファイルのタブの隣に現れます。

**関連項目:** [統合ターミナル](terminal.md)
