---
title: 対話的リベース
category: ブランチと手術
order: 42
summary: 並べ替え、スカッシュ、fixup、メッセージの書き直し、編集、破棄を、ドラッグで。
keywords: 対話的リベース interactive rebase squash スカッシュ fixup reword 書き直し drop 破棄 edit autosquash todo
---

# 対話的リベース

`git rebase -i` の todo リストを、ドラッグできる一覧にしたものです。

![対話的リベースのエディタ](../../screenshots/interactive-rebase.webp)

| アクション | 意味 |
|---|---|
| **pick** | そのまま残す |
| **reword** | 変更は残し、メッセージを編集する |
| **squash** | 上のコミットに畳み込み、両方のメッセージを合わせる |
| **fixup** | 上のコミットに畳み込み、こちらのメッセージは捨てる |
| **edit** | ここで止めて、修正できるようにする |
| **drop** | そのコミットを捨てる |

行をドラッグして並べ替えます。エディタがターミナルで開くことはありません。todo は
Gitcito が書きます。

## autosquash を 1 クリックで

- **ステージした変更をこのコミットへ fixup** が `fixup!` を作ります。
- **ここから autosquash** が、すべての `fixup!` / `squash!` を送り先へ畳み込みます。

レビュー指摘の修正が 1 つではなく山ほどあるなら、[アブソーブ](absorb.md) が各ハンクの
属すべきコミットを割り出してくれるので、自分で考える必要はありません。

> リベースは履歴を書き換えます。すでにプッシュしたものはフォースプッシュが必要になり、
> レビューした人は [前回から何が変わったか](range-diff.md) を見たがるはずです。

**関連項目:** [アブソーブ](absorb.md) · [前回から何が変わったか](range-diff.md) · [復旧](recovery.md)
