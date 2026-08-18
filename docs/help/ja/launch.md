---
title: 実行とデバッグ（launch.json）
category: ワークスペースツール
order: 91
summary: VS Code の起動構成を Gitcito から離れずに実行する。
keywords: launch.json run 実行 debug デバッグ vscode configs 構成 設定 tasks タスク preLaunchTask input background バックグラウンド 起動 compound compounds stopAll serverReadyAction 並列セッション
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
- **compound** は各メンバーを**それぞれ並列のセッション**として実行します —
  compound 名の付いた 1 つの分割ターミナルに、メンバーごとに 1 ペイン。VS Code の
  デバッグセッションと同じです。`stopAll: true` なら、1 つを停止するとすべて停止します。
  複数のメンバーが共有するタスクは、メンバーの起動前に専用ペインで**一度だけ**
  実行されます — バージョン更新のプロンプトはメンバーごとではなく一度だけ表示されます。
  このペインは成功すると自動で閉じ、失敗した場合は開いたままになります。
- **`serverReadyAction`** に対応: セッションの出力が設定したパターンに一致すると、
  告知された URL をブラウザで開きます（`openExternally`。`debugWithChrome` /
  `debugWithEdge` もブラウザを開くだけです — Gitcito はデバッガをアタッチできません）。

![2 つの並列セッションを実行する compound](../../screenshots/launch-compound.webp)

フローティングツールバーから **一時停止 / 再開、再起動、停止** ができ、実行中の
セッションを切り替えられます。

**設定 → 一般 → launch.json を有効にする** でオンにします。**実行** ボタンが Git /
ファイルのタブの隣に現れます。

compound のメンバーは *compound › メンバー* と表示され、再起動はそのメンバー
だけを再起動します。

Gitcito があえて**しない**こと: プログラムを本物のターミナルで実行しますが、
デバッガではありません — ブレークポイントも変数インスペクションも Debug
Adapter Protocol もありません。attach 専用の構成は `preLaunchTask` を持つ場合に
機能します（タスクこそが仕事です）。純粋な attach には実行するものがありません。

**関連項目:** [統合ターミナル](terminal.md)
