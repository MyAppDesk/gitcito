---
title: キーボードとショートカット
category: はじめに
order: 2
summary: 覚える価値のあるキーと、その割り当てを変える方法。
keywords: ショートカット shortcuts キーボード keyboard キー keys チートシート cheatsheet 再割り当て rebind ホットキー hotkeys パレット palette
---

# キーボードとショートカット

どこでも <kbd>?</kbd> を押せばチートシートが出ます。

![ショートカットのチートシート](../../screenshots/cheatsheet.webp)

## 覚える価値のあるもの

| キー | 動作 |
|---|---|
| <kbd>⌘K</kbd> | [コマンドパレット](search.md) — ブランチ、コミット、ファイル、アクション |
| <kbd>⌘⇧F</kbd> | 作業ツリー全体の [コード検索](search.md) |
| <kbd>⌘⇧V</kbd> | [金庫](vault.md) |
| <kbd>⌘O</kbd> / <kbd>Ctrl+O</kbd> | リポジトリを開く |
| <kbd>⌘,</kbd> / <kbd>Ctrl+,</kbd> | 設定を開く |
| <kbd>⌘F</kbd> | いま読んでいるファイルや差分の中を検索 |
| <kbd>⌘T</kbd> / <kbd>Ctrl+T</kbd> | 新規タブのリポジトリ／グループピッカーを開く |
| <kbd>⌘W</kbd> / <kbd>Ctrl+W</kbd> | アクティブなタブを閉じる — タブがなくなればウィンドウを閉じる |
| <kbd>⌘1</kbd>–<kbd>⌘9</kbd> / <kbd>Ctrl+1</kbd>–<kbd>Ctrl+9</kbd> | 位置でタブを切り替える |
| <kbd>⌘⇧T</kbd> | 最後に閉じたタブを開き直す |
| <kbd>?</kbd> | このチートシート |

## マウスなしで動き回る

| 場所 | キー |
|---|---|
| コミットグラフ | <kbd>↑</kbd> <kbd>↓</kbd> または <kbd>j</kbd> <kbd>k</kbd> |
| ファイル一覧（コミット、作業中、スタッシュ） | 同じ |
| [タイムマシン](time-machine.md) | <kbd>←</kbd> <kbd>→</kbd>、10 個ずつなら <kbd>⇧</kbd>、<kbd>Home</kbd>/<kbd>End</kbd> |
| [ミッションコントロール](mission-control.md) | <kbd>↑</kbd><kbd>↓</kbd>、開くのは <kbd>Enter</kbd>、フェッチ／プルは <kbd>f</kbd>/<kbd>p</kbd>、絞り込みは <kbd>/</kbd> |
| コミットメッセージ欄 | <kbd>↑</kbd> <kbd>↓</kbd> で最近のメッセージを呼び出す |

## 割り当てを変える

**設定 → ショートカット**。中核となる移動系のショートカット（パレット、コード検索、
金庫、リポジトリを開く、設定）は再割り当てでき、衝突の検出とショートカットごとの
リセットが付いています。

上に挙げた固定のショートカットは再割り当てできず、_割り当て先_ としても拒否されます。
アプリは <kbd>⌘T</kbd>、<kbd>⌘W</kbd>、<kbd>⌘1</kbd>–<kbd>⌘9</kbd>、
<kbd>⌘⇧T</kbd>、<kbd>⌘S</kbd>、<kbd>⌘Z</kbd>、<kbd>⌘⇧Z</kbd>、<kbd>⌘F</kbd> を
あなたの設定を見るより先に処理するため、これらに割り当てたショートカットは設定できた
ように見えて決して発火しません。選ぼうとすると、エディタは受け付ける代わりにその旨を
伝えます。

![設定画面の再割り当て可能なショートカット](../../screenshots/settings-shortcuts.webp)

**関連項目:** [コマンドパレットと検索](search.md)
