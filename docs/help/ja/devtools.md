---
title: Flutter DevTools
category: ワークスペースツール
order: 93
summary: ネットワークビュー、タイムライン、インスペクター、メモリプロファイラーを Gitcito のタブで。
keywords: devtools flutter dart ネットワーク network タイムライン インスペクター メモリ プロファイラー webview 埋め込み パネル vm service
---

# Flutter DevTools

DevTools にはネットワークビュー、タイムライン、ウィジェットインスペクター、メモリ
プロファイラーがすでにあり、しかもそれは自分のマシンで配信される Flutter web アプリ
です。だから Gitcito はどれも作り直しませんし、Dart VM Service と自分で話すこともあり
ません。アドレスに気づいて、埋め込むだけです。

![Gitcito のタブで開いた DevTools](../../screenshots/devtools.webp)

VM サービスが立ち上がると、`flutter run` がこの行を出します:

```
The Flutter DevTools debugger and profiler on iPhone 16 Pro is available at:
http://127.0.0.1:9100?uri=http://127.0.0.1:53412/uJ8k=/
```

起動セッションは自分の出力をこの行のために見張っていて、デバッグツールバーにボタンが
増えます。押すと DevTools は**リポジトリそのものの上**に、独立したタブではなく
その[アイコン](workspaces.md)の一つとして開きます。セッションごとに一つ — 同時に
二つアプリが走っていれば DevTools も二つです。

**ホットリスタートは新しいアドレスを公開します。** セッションが生きているあいだ、
パネルはそれに追随します。セッションが終われば、パネルは最後のアドレスを保持
しますが、たいていそれは死んでいます。アイコンを閉じて、新しい実行から開き直して
ください。

## どのツールか

ここに載る条件は二つだけです。このマシンで Web の UI を配信すること、そして
そのアドレスを出力すること。

| ツール | 出力する行 |
|---|---|
| Flutter DevTools | `The Flutter DevTools … is available at: <url>` |
| Dart DevTools (`dart devtools`) | `Serving DevTools at <url>` |
| Vue DevTools (`@vue/devtools`) | `Vue Devtools … listening on <url>` |
| Prisma Studio | `Prisma Studio is up on <url>` |
| Drizzle Studio | `Drizzle Studio is up and running on <url>` |
| webpack-bundle-analyzer | `Webpack Bundle Analyzer is started at <url>` |
| ほかに DevTools とアドレスを名乗るもの | 汎用の一致に落ちます |

**埋め込めないもの、その理由。** Node の inspector が出すのはデバッガーが接続する
`ws://` エンドポイントであって、ページではありません。対になる Chrome DevTools の
フロントエンドは `devtools://` の URL の向こうにあり、埋め込みビューが読み込むこと
は許されていません。React DevTools のスタンドアロン版はそれ自体がデスクトップの
ウィンドウで、配信されるページではありません。どちらもここのタブにはなれません。
必要なのはアドレスではなくデバッグプロトコルのクライアントだからです。

**開発サーバーは開発ツールではありません。** `:5173` の Vite はあなたのアプリで、
埋め込めばそれはプレビューパネル — 別の機能であり、ここでは意図的に扱いません。

## 何が許されているか

埋め込みビューの綱は短くしてあります。このアプリは資格情報を預かっているからです。

- **ループバックのみ。** `127.0.0.1`、`localhost`、`::1`。ほかのアドレスでの接続は
  拒否され、そこへのリダイレクトも拒否されます。
- **preload なし、node integration なし、コンテキスト分離あり。** ページから Gitcito
  への橋はありません。
- **リンクは本物のブラウザーで開きます。** 通常のウィンドウであって、パネルの中では
  ありません。

## 限界

- **これは DevTools であって、私たちのものではありません。** そのバージョンにできる
  ことはパネルにもでき、できないことは私たちにもできません。Gitcito 味のネットワーク
  ビューはありません。
- **こう名乗るのは Flutter だけです。** ふつうの Dart プログラムは VM サービスの URL
  は出しますが DevTools のアドレスは出さないので、ボタンも出ません。
- **パネルが真っ白なら、アプリが止まっています。** DevTools を配信しているのは
  *動いているアプリ*で、終了すればそのアドレスは応答しなくなります。

**関連項目:** [実行とデバッグ](launch.md)
