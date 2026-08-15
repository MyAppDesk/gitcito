---
title: フックと .gitignore
category: ワークスペースツール
order: 92
summary: git フックを管理し、手作業での編集なしにファイルを無視します。
keywords: hooks フック pre-commit husky core.hooksPath gitignore ignore 無視 untrack 追跡をやめる
---

# フックと .gitignore

## フック

リポジトリのすべてのフックを一覧し、どれが実際のもので、どれがまだ `.sample` のまま
かを確認し、有効化・無効化・編集・作成ができます。

![フックマネージャー](../../screenshots/hooks.webp)

Gitcito は独自の **`core.hooksPath`**（husky とその仲間）と **pre-commit フレーム
ワーク**の設定を検出し、フックが `.git/hooks` 以外の場所にある場合はそれを伝えます —
そうでなければ、git が決して実行しないファイルを編集することになりかねません。

> フックは Gitcito のコミットに対しても `git commit` とまったく同じように走ります。
> 失敗したフックはコミットを止め、その出力はエラーとして返ってきます。

## かしこい .gitignore

ファイルを右クリック → **無視する…** で、次から選びます。

| 選択肢 | 書き込まれるもの |
|---|---|
| このファイルだけ | `path/to/file.log` |
| `*.ext` のファイルすべて | `*.log` |
| フォルダーまるごと | `path/to/folder/` |

![.gitignore の選択画面](../../screenshots/gitignore-chooser.webp)

ルールは**最も近いフォルダーの** `.gitignore`、またはリポジトリのルートに書き込まれ
ます。確定する前に、書かれる行をライブプレビューで確認できます。すでに追跡されている
ファイルには、同じダイアログに **無視して追跡をやめる** が現れます。

**関連項目:** [セキュリティと秘密情報](security.md) · [ステージング](staging.md)
