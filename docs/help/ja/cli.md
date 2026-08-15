---
title: コマンドライン
category: ワークスペースツール
order: 93
summary: `gitcito .` — `code .` の Git 版です。
keywords: cli command line コマンドライン terminal ターミナル shim シム path PATH install インストール open folder フォルダーを開く single instance 単一インスタンス
---

# コマンドライン

```sh
gitcito .                        # open this folder
gitcito ~/code/api               # …or that one
gitcito . -n "My API"            # with a display name
gitcito . -g "Work"              # inside a group tab
gitcito . -n "My API" -g "Work"  # both
```

## シムのインストール

コマンドパレット（<kbd>⌘K</kbd>） → **「gitcito」コマンドを PATH にインストール**
（macOS）。小さなシムを `/usr/local/bin` または `/opt/homebrew/bin` にシンボリック
リンクします。どちらもあなたに書き込み権限がないときだけ、管理者権限を求めます。
同じコマンドをもう一度実行するとアンインストールします。

## ふるまい

- そのパスが**すでに開かれている**場合 — タブとして、あるいはグループの中に — Gitcito
  は重複して開かず、**そこにフォーカスします**。
- まだ Git リポジトリでない場合も開き、「ここにリポジトリを初期化する」フローを提示
  します。
- `-g` はその名前のグループにリポジトリを追加し、グループが存在しなければ作成します。
- Gitcito は**単一インスタンス**です。アプリが開いている状態で `gitcito` を実行すると、
  2 つめのコピーを起動するのではなく、そのウィンドウに要求を渡します。

**関連項目:** [ワークスペース、タブ、グループ](workspaces.md)
