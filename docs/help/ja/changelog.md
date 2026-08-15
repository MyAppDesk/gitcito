---
title: チェンジログ生成
category: 変更を扱う
order: 34
summary: 2 つの ref のあいだの Conventional Commits を、種類ごとにまとめたチェンジログに変える。
keywords: changelog チェンジログ 変更履歴 release notes リリースノート conventional commits コミット規約 generate 生成 CHANGELOG
---

# チェンジログ生成

ref を 2 つ与えると — 既定は **最新のタグ → HEAD** です — そのあいだのコミットを
チェンジログに変え、Conventional Commit の種類ごとにまとめます。

![チェンジログ生成](../../screenshots/changelog-gen.webp)

- **破壊的変更** は、どの種類から来たものであっても最初に出します。
- 続いて Features、Fixes、Performance、と並びます。
- どの規約にも従っていないコミットは、落とすのではなく **Other** に入ります —
  黙ってコミットを取りこぼすチェンジログは、雑然としたチェンジログより悪いからです。

結果をコピーするか、**そのまま `CHANGELOG.md` の先頭に追記** できます。

> これが役に立つかどうかは、メッセージを [Conventional なスタイル](committing.md)
> で書いているかにかかっています。生成器は、読み取る件名の質を超えられません。

**関連項目:** [コミット](committing.md) · [ホスティングとプルリクエスト](hosting.md)
