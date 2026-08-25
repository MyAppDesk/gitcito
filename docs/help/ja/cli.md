---
title: コマンドライン
category: ワークスペースのツール
order: 93
summary: `gitcito .` はリポジトリを開き、`gitcito doctor` は何も開かずに答えます。
keywords: cli コマンドライン ターミナル shim path インストール 開く フォルダ 単一インスタンス doctor status repos commit-check config editor completions wait core.editor blame show search 動詞 終了コード ci hook
---

# コマンドライン

ターミナルから発せられる問いは二種類あり、`gitcito` はそのどちらにも答えます。

一つ目は *「これを見せて」* です。クローンの中にいて、何かを見たい。それを見るには
アプリが適した場所です。この種の呼び出しはウィンドウを開き、尋ねたものにできるだけ
近い場所を表示します。

二つ目は *「今すぐ教えて」* です。フック、CI ジョブ、あるいはパイプの途中にいる
あなたが、ウィンドウではなく答えと終了コードを求めている。この種の呼び出しはアプリを
起動しません。標準出力に書いて、すぐ道を空けます。

```sh
gitcito .                        # このフォルダを開く
gitcito blame src/api.ts -l 84   # …その行の blame で
gitcito doctor                   # ウィンドウなし: リポジトリを検査し、失敗なら 1 で終了
```

## インストール

コマンドパレット（<kbd>⌘K</kbd>）→ **'gitcito' コマンドを PATH にインストール**。
macOS では小さなシムを `/usr/local/bin` か `/opt/homebrew/bin` にシンボリック
リンクし、どちらにも書き込めない場合にだけ管理者権限を求めます。Linux では権限の
要らない `~/.local/bin` に入ります。同じコマンドでアンインストールできます。Windows
はまだ非対応です。

必要なら、続けて:

```sh
gitcito completions zsh >> ~/.zshrc     # bash や fish も可
```

## 開く

| コマンド | 開くもの |
|----------|----------|
| `gitcito [パス]` | リポジトリ（既定はカレントディレクトリ） |
| `gitcito open <名前>` | **タブ名**でリポジトリを — `gitcito open api` |
| `gitcito diff` | 作業ツリーの変更 |
| `gitcito graph` | コミットグラフ |
| `gitcito show <ref>` | 単一のコミット — `HEAD~2`、タグ、短いハッシュ |
| `gitcito blame <ファイル>` | ファイルの blame。`-l 84` でその行へ |
| `gitcito search <検索語>` | コード検索（検索語を入力済み） |
| `gitcito stack`, `stash`, `reflog`, `conflicts`, `todos`, `chat`, `settings` | 該当パネル |
| `gitcito ci`, `clean`, `bisect`, `absorb`, `snapshots`, `insights`, `terminal` | …など |

`gitcito help verbs` が全一覧を表示します。三つのオプションはすべてに効きます。
`-n <名前>` はタブの表示名、`-g <グループ>` はグループタブへの配置（必要なら作成）、
`-l <n>` は行の指定です。

Gitcito は**単一インスタンス**です。アプリが開いている状態で `gitcito` を実行すると、
二つ目のコピーを起動する代わりに、その要求を既存のウィンドウへ渡します。すでに開いて
いるパスは — タブでもグループ内でも — 複製されず**フォーカスされます**。まだリポジトリ
でないフォルダも開き、「ここにリポジトリを作成」の導線を示します。

## ターミナルで答える

これらは出力して終了します。ウィンドウは開かず、アプリが起動している必要すらありません。

### `gitcito status`

ブランチ、追跡、先行／遅れ、作業ツリー、スタッシュ、そしてリポジトリが用意していれば
[`.gitcito.json` の push チェックリスト](repo-config.md)。作業ツリーに衝突がある
ときは 1 で終了するので、`gitcito status || echo ブロック中` が使えます。

### `gitcito doctor [--fix]`

[リポジトリ設定](repo-config.md)パネルと同じ検査を実行します。Node のバージョン、
サブモジュール、LFS、`core.hooksPath`、必須ファイル。**いずれかが失敗すれば 1 で
終了します**。それこそが要点です。リポジトリが宣言した規則も、GUI を開いている人しか
見ないのでは値打ちがありません。

```yaml
- run: gitcito doctor          # CI で、高価な処理の前に
```

`--fix` は doctor が知っている修復（サブモジュールの初期化、`lfs pull`、
`core.hooksPath` の設定、例ファイルからのコピー）を適用し、再検査します。設定ファイル
が与えたコマンドを実行することは決してありません。修復の集合は閉じています。

警告では実行は失敗しません。警告は doctor が何かを判定できなかったという意味で、何かが
壊れているという意味ではありません。それでビルドを落とせば、このファイルは導入コストが
高すぎるものになってしまいます。

### `gitcito commit-check [ファイル]`

コミットメッセージを検査します。引数なしなら `.git/COMMIT_EDITMSG` を読み、`-m "…"`
なら文字列を検査します。リポジトリが宣言した内容を知っています。`.gitcito.json` が
スコープを列挙していれば未知のスコープは**エラー**、列挙していなければ単なる書き方の
助言です。フックに組み込むには:

```sh
# .husky/commit-msg
gitcito commit-check "$1"
```

### `gitcito config init | show | check`

`init` はリポジトリを読み、すでにあるもの — `.nvmrc`、`.gitmodules`、`.env` のない
`.env.example`、履歴で使われているコミットスコープ — から `.gitcito.json` を提案し
ます。`--dry-run` は書き込まずに表示します。`show` は現在のファイルを表示し、`check`
は検証して破棄される項目を列挙します。

### `gitcito repos [フィルタ]`

Gitcito が知っているすべてのリポジトリ（まず開いているタブ、次に最近使ったもの）を
グループ付きで表示します。`--paths` はスクリプト向けに、パスだけを 1 行ずつ出力します。

```sh
cd "$(gitcito repos --paths api | head -1)"
```

## Gitcito を git のエディタにする

```sh
gitcito editor install
```

これで `core.editor` と `sequence.editor` が `gitcito --wait` になります。以降、
`git commit`（`-m` なし）、`git commit --amend`、`git tag -a`、`git rebase -i` は
vim ではなく Gitcito でファイルを開き、文字数カウンタとコンポーザーと同じメッセージの
ヒントが付きます。

![git がエディタを求めたときに Gitcito が開く画面](../../screenshots/cli-edit.webp)

肝心なのは**待っている**という点です。git はそのダイアログで停止しています。したがって

- **保存して続行** はファイルを書き戻し、git は先へ進みます。
- **キャンセル** は空のファイルを書き、git はそれを*中止*と読みます。
- それ以外の方法でダイアログを閉じること — Escape、背景、Gitcito の終了 — も
  キャンセル扱いです。永遠に待たされるターミナルは、書き直すメッセージよりはるかに
  ひどい結果だからです。

一つのリポジトリだけに適用するには `--local` を付け、`gitcito editor uninstall` で
元に戻します。

## しないこと

- **ターミナルの動詞はリポジトリを変更しません。** 例外は `doctor --fix` だけで、その
  修復は固定の一覧です。設定ファイルが増やせるものではありません。
- **`repos` は読み取り専用です。** 設定ファイルは動作中のアプリのもので、CLI は読む
  だけで決して書きません。
- **インストール済みのアプリが知らない動詞は無視されます**（拒否ではありません）。新しい
  シムを古いアプリに対して使っても、リポジトリは開きます。
- **Windows 用のシムはまだありません。** 動詞はすべて実装済みで、欠けているのは
  インストール経路だけです。

**関連:** [ワークスペース・タブ・グループ](workspaces.md) ·
[リポジトリ設定](repo-config.md) · [コミット](committing.md)
