---
title: 実行とデバッグ（launch.json）
category: ワークスペースツール
order: 91
summary: VS Code の起動構成を Gitcito から離れずに実行する。
keywords: launch.json run 実行 debug デバッグ vscode configs 構成 設定 tasks タスク preLaunchTask input background バックグラウンド 起動 compound compounds stopAll serverReadyAction 並列セッション hot reload hot restart device simulator emulator run target flutter metro expo vite nodemon vitest jest mocha ava wrangler dotnet watch adb simctl avd xcodebuild capacitor
---

# 実行とデバッグ

Gitcito はあなたの `.vscode/launch.json` を読み — ルートのものも、入れ子になった
ものも、区切り線でグループ分けして — 選んだ構成を統合ターミナルで実行します。

![起動構成のピッカーとフローティングツールバー](../../screenshots/launch-configs.webp)

- VS Code の**変数は解決されます**（`${workspaceFolder}` とその仲間）。
- 構成の **`preLaunchTask`** が先に走ります。
- **`${input:…}`** の値は起動前に対話的に尋ねられます（`promptString` と
  `pickString`）。
  `pickString` は既定値が選択済みの本物のピッカーとして選択肢を表示します。
  `password` 指定の `promptString` は入力がマスクされます。
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

![既定値が選択済みの ${input} ピッカー](../../screenshots/launch-input.webp)

フローティングツールバーから **一時停止 / 再開、再起動、停止** ができ、実行中の
セッションを切り替えられます。

**設定 → 一般 → launch.json を有効にする** でオンにします。**実行** ボタンが Git /
ファイルのタブの隣に現れます。

compound のメンバーは *compound › メンバー* と表示され、再起動はそのメンバー
だけを再起動します。
ツールバーが必要なものに重なったら、グリップをドラッグして横にずらせます — 位置は記憶され、グリップをダブルクリックすると中央に戻ります。

Gitcito があえて**しない**こと: プログラムを本物のターミナルで実行しますが、
デバッガではありません — ブレークポイントも変数インスペクションも Debug
Adapter Protocol もありません。attach 専用の構成は `preLaunchTask` を持つ場合に
機能します（タスクこそが仕事です）。純粋な attach には実行するものがありません。

## ホット操作 — 「再起動」の隣にある近道

![デバッグツールバーから送ったホットリロード](../../screenshots/launch-hot.webp)

たいていの開発ランタイムは、もともとキー 1 つで再読み込みします。`flutter run`
は **r**、Metro は **r**、nodemon は **rs ⏎**、Vitest は **a** でスイートを再実行
します。同じ結果のために起動構成を再起動するのは遅い道です — プロセスを落とし、
すべての `preLaunchTask` をやり直し、アプリの状態を捨ててしまいます。

そこで Gitcito は、構成が実際に起動するコマンドを読み取り — `npm run dev` は
`package.json` のスクリプトまで追いかけます — そのランタイムのキーをデバッグ
ツールバーに並べます。押すと、そのキーがセッションの標準入力に書き込まれます。
ターミナルで自分でタイプしたのとまったく同じです。

| ランタイム | ボタン | ⋯ の中 |
|-----------|--------|--------|
| Flutter（`flutter run`） | ホットリロード `r`、ホットリスタート `R` | デバッグペイント、パフォーマンスオーバーレイ、プラットフォーム切り替え、DevTools |
| Expo | 再読み込み `r` | 開発者メニュー、デバッガー |
| Metro / React Native | 再読み込み `r` | 開発者メニュー、デバッガー |
| Vite（dev、serve、preview） | サーバーを再起動 `r ⏎` | ブラウザーで開く、URL を表示、コンソールをクリア |
| nodemon | 再起動 `rs ⏎` | — |
| Vitest（watch モード） | すべて再実行 `a`、失敗を再実行 `f` | スナップショットを更新 |
| Jest（`--watch`） | すべて再実行 `a`、失敗を再実行 `f` | 変更ファイルのみ、スナップショットを更新 |
| Mocha（`--watch`） | 再実行 `rs ⏎` | — |
| AVA（`--watch`） | すべて再実行 `r ⏎`、スナップショットを更新 `u ⏎` | — |
| `dotnet watch` | 強制再起動 `Ctrl+R` | — |
| Wrangler（`wrangler dev`） | ブラウザーで開く `b` | DevTools、ローカル/リモート、コンソールをクリア |

自分で再読み込みするランタイムにはボタンを出しません — `node --watch`、
`ng serve`、`tsc --watch`、`cargo watch`、`next dev`、webpack-dev-server。誰も
読まないキーを送るボタンは、ボタンが無いよりたちが悪い。効いたように見えるから
です。

**限界。** 判定はテキストベースです。コマンドラインのプログラム名を照合するので、
Gitcito が読めないラッパースクリプト経由で開発サーバーを起動する構成には何も
出ません。キー送信の確認応答もありません — ボタンが一瞬光るだけで、本当の答えは
プロセス自身の出力です。一時停止中や終了済みのセッションは入力を受け取らないので、
ボタンは無効になります。

**推測が外れたら**、構成自体に書いてください:

```json
{
  "name": "API (watch)",
  "type": "node-terminal",
  "command": "./scripts/dev.sh",
  "gitcito": { "hotActions": [{ "label": "Reload", "send": "r", "icon": "reload" }] }
}
```

`send` はそのまま書き込まれます — Enter を待つ CLI には末尾に `\n` を付けます。
`icon` は省略可能です: `reload`, `restart`, `rerun`, `failed`, `snapshot`, `menu`, `debugger`,
`browser`, `clear`, `paint`, `perf`, `platform`, `devtools`, `urls`。
空の `hotActions` 配列は、その構成のボタンを無効にします。

## 実行ターゲット — どのデバイスで構成を起動するか

![LAUNCH タブの隣で実行ターゲットを選ぶ](../../screenshots/launch-device.webp)

モバイルアプリをビルドする構成には、どこで実行するかを教える必要があります。
この選択は Flutter だけのものではありません — React Native、Expo、Capacitor、
xcodebuild もターゲットを取り、しかも書き方はそれぞれ違います。だから Gitcito は
**LAUNCH** タブの隣で一度だけ尋ね、その構成のランタイムが読む形で書き込みます。
ピッカーは、リポジトリのどれかの構成が実際にデバイスを取れるときだけ現れます。

**一覧の出どころ** — マシンにある SDK ツールを、並行して尋ねます:

| ツール | 提供するもの | 尋ねる条件 |
|--------|--------------|------------|
| `flutter devices` / `flutter emulators` | すべて、正規化済み | フォルダーに `pubspec.yaml` がある |
| `xcrun simctl` | iOS シミュレーター（起動中も未起動も） | macOS で |
| `adb devices` | Android 実機と起動済みエミュレーター | 常に |
| `emulator -list-avds` | まだ未起動の Android エミュレーター | 常に |

同じシミュレーターは最大 3 つのツールから報告されるので、プラットフォームと名前
で統合します。同点なら Flutter が勝ちます — `flutter run -d` が待っているのは
その id だからです。入っていないツールはメニュー下部に名前で出ます。短い一覧は
自分で理由を説明すべきです。

**選択が何をするか:**

| ファミリー | 書き込まれ方 |
|-----------|--------------|
| Flutter | `-d <id>` |
| React Native iOS | `--udid <id>` |
| React Native Android | `--deviceId=<id>` |
| Expo `run:ios` / `run:android` | `--device <id>` |
| Capacitor / Ionic | `--target <id>` |
| xcodebuild | `-destination id=<id>` |
| それ以外 | 環境変数のみ |

起動した構成には `GITCITO_DEVICE_ID`、`GITCITO_DEVICE_NAME`、
`GITCITO_DEVICE_PLATFORM` が環境変数として渡り、ターゲットが実機の Android なら
`ANDROID_SERIAL` も付きます。ラッパースクリプトや Gradle タスク、素の `adb` が
同じ端末に当たるのは、これのおかげです — Gitcito はコマンドを書き換えません。

**未起動のデバイスを起こす。** *未起動* の下の項目は、選ぶと起動します:
`flutter emulators --launch`、`xcrun simctl boot`（と Simulator ウィンドウ）、
または切り離して実行する `emulator -avd` — Gitcito を終了しても Android
エミュレーターは道連れになりません。

**限界。** すでにデバイスを指定している構成 — 明示的な `-d`、`--simulator`、
Dart-Code の `deviceId` — はそのままです。ピッカーが作者の記述を上書きすることは
ありません。シェルのクォートが要る id は、コマンドラインを壊す危険を冒すより
環境変数に回します。メニューは構成が到達できる範囲で絞られるので、Android のみの
リポジトリに iPhone が出ることはありません。一覧はスナップショットです。端末を
挿したら **デバイスを更新** を押してください。

選択はリポジトリごとに記憶され、そのデバイスが存在しなくなると忘れられます。

**関連項目:** [統合ターミナル](terminal.md)
