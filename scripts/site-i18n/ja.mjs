// Website chrome in ja. Keys mirror en.mjs; anything missing falls back to English.
export const ja = {
  'nav.handbook': 'ハンドブック',
  'nav.roadmap': 'ロードマップ',
  'nav.github': 'GitHub',
  'nav.sponsor': 'スポンサー',
  'nav.download': 'ダウンロード',

  'foot.license': 'MIT ライセンス · <a href="https://myappdesk.dev">MyAppDesk</a> が 💜 を込めて作りました',
  'foot.source': 'ソース',
  'foot.roadmap': 'ロードマップ',
  'foot.reportIssue': '問題を報告',
  'foot.sponsor': 'スポンサー',

  'meta.title': 'Gitcito — git のすべてを見せる UI',
  'meta.description':
    '完全に vibe-coded な Git クライアント。無料。グラフ、1 行単位のステージング、リベース、ワークツリー、サブモジュール、LFS — さらに、git にできるとは知らなかったことをいくつか。',

  'hero.title': 'git のすべてを、<br /><em>そのまま見せてくれる UI</em>',
  'hero.lede':
    'グラフ、1 行単位のステージング、リベース、ワークツリー、サブモジュール、LFS。<br />ふつうのことを、きちんと — さらに、git にできるとは知らなかったことをいくつか。',
  'hero.download': 'お使いのプラットフォーム用をダウンロード',
  'hero.source': 'ソースを見る',
  'hero.terms': '無料 · MIT · v{version}',
  'hero.graphAlt': 'Gitcito のコミットグラフ',

  'features.title': 'git にできるとは知らなかったことを、いくつか',
  'features.sub':
    'どれも Gitcito を使う理由ではありません — 理由は上のリストです。これらがあるのは、git がすでに答えを知っているから。Gitcito はただ、それを訊くだけです。',

  'ordinary.title': '手に入るもの',
  'ordinary.sub':
    '一部ではなく、完全なクライアントです。すべて作られ、解説され、今日のアプリに入っています — ふつうのことであり、git を使うということの大半はそれです。',
  'ordinary.graph': '本物のレーンを持つコミットグラフ。巨大な履歴もウィンドウ方式で',
  'ordinary.staging': '1 行単位までのステージング',
  'ordinary.conflicts': 'どちらがどちら側なのかを言う 3 ペインのコンフリクトリゾルバ',
  'ordinary.rebase': 'ドラッグでできる対話的リベース',
  'ordinary.stacks': '連鎖的なリスタックつきのスタックブランチ',
  'ordinary.recovery': 'reflog、WIP スナップショット、手順つきの bisect',
  'ordinary.prs': 'GitHub、GitLab、Bitbucket、Azure DevOps のプルリクエスト',
  'ordinary.terminal': '統合ターミナル — 本物の PTY',
  'ordinary.launch': '<code>.vscode/launch.json</code> からそのまま実行とデバッグ',
  'ordinary.ai': '読んだ行を引用する、任意の AI',
  'ordinary.themes': '組み込みテーマ、ライトとダーク、さらに AI 生成のもの',
  'ordinary.languages':
    'ハンドブック込みで全体を翻訳 — アラビア語とヘブライ語はレイアウトが反転します',
  'ordinary.conflictAlt': 'コンフリクトリゾルバ',

  'download.title': 'ダウンロード',
  'download.sub':
    '最新リリースは <strong>v{version}</strong> です。すべてのビルドは CI から公開されます。',
  'download.cli':
    'または <code>gitcito .</code> でターミナルからリポジトリを開けます — <a href="{cli}">コマンドライン</a>を参照してください。',
  'download.macNote': 'Apple silicon &amp; Intel · 署名と公証済み',
  'download.winNote': 'インストーラー（x64）',
  'download.linuxNote': 'AppImage · deb',
  'download.forOs': '{os} 版をダウンロード',

  'handbook.title': '{pages} ページのハンドブックを、アプリに内蔵',
  'handbook.sub': 'すべての機能に解説を — アプリの中でオフラインでも、そしてこの場でも。',

  'sponsor.title': 'Gitcito をスポンサーする',
  'sponsor.body':
    '無料、MIT、バックエンドなし、テレメトリなし、売りつけるものもなし — つまり買うものは何もありません。スポンサーは、署名済み macOS ビルドに必要な Apple Developer 証明書と、ハンドブックと翻訳の費用になります。バグ報告にも同じだけの価値があります。',
  'sponsor.cta': 'GitHub でスポンサーする',

  'doc.titleSuffix': 'Gitcito ハンドブック',
  'doc.filter': 'ページを絞り込む…',
  'doc.filterLabel': 'ページを絞り込む',
  'doc.edit': 'このページを GitHub で編集',
  'doc.improve': 'この翻訳を GitHub で改善',

  'feature.conflict-radar.title': 'コンフリクトレーダー',
  'feature.conflict-radar.body':
    'どのブランチがコンフリクトするかを、どれ一つマージする<strong>前に</strong>見られます。マージはオブジェクトデータベースのなかで起きます — チェックアウトなし、作業ツリーの変更なし、あとで片付けるものもなし。',
  'feature.recovery.title': 'WIP スナップショット',
  'feature.recovery.body':
    '作業ツリー全体を — 未追跡ファイルも含めて — タイマーで、そして<strong>破壊的な操作の直前に必ず</strong>スナップショット。後悔した破棄も、復元ひとつで戻せます。',
  'feature.commit-edit.title': 'どのコミットでも編集',
  'feature.commit-edit.body':
    'タイプミスは 3 週間前？ <strong>古いコミットの中で</strong>ファイルを編集 — その上のすべてがリプレイされ、ref がひとつでも動く前にカスケード全体をプレビューできます。',
  'feature.ai.title': '自分のモデルを持ち込む',
  'feature.ai.body':
    '複数の AI アカウントを同時に — コミットメッセージには OpenAI のキー、チャットには Claude、残りはローカルの Ollama。モデル一覧は各プロバイダーからライブで取得。サインイン済みの CLI なら API キーの代わりになります。',
  'feature.semantic-diff.title': 'セマンティック差分',
  'feature.semantic-diff.body':
    '400 行の赤と緑の壁ではなく、<code>startServer</code> → <code>bootServer</code>。正規表現ではなく、本物の tree-sitter 解析です。',
  'feature.range-diff.title': '前回から何が変わったか',
  'feature.range-diff.body':
    'レビューしたブランチをフォースプッシュされた。どのコミットが書き換えられ、落とされ、追加されたのかが見えます — 古い位置は reflog からただで手に入ります。',
  'feature.repo-chat.title': 'リポジトリチャット',
  'feature.repo-chat.body':
    'このリポジトリに質問すると、読んだ行を引用した回答が返ります。見てほしいファイルやコミットは、グラフ・ファイルツリー・ディスク上のどこからでもドラッグして固定できます。',
  'feature.absorb.title': 'アブソーブ',
  'feature.absorb.body':
    'レビュー指摘の修正をステージすれば、blame が各ハンクを、それを持ち込んだコミットへ <code>fixup!</code> として振り分けます。',
  'feature.time-machine.title': 'タイムマシン',
  'feature.time-machine.body':
    'スライダーを動かすと、リポジトリが変わっていきます。ファイルが現れ、移動し、戻ってくる。HEAD は動かず、コミットしていない作業にも触れません。',
  'feature.timelapse.title': 'タイムラプス',
  'feature.timelapse.body':
    'リポジトリの一生をアニメーションとして再生し、動画として書き出せます。ページの中で録画するので、入れておくエンコーダーはありません。',
  'feature.pr-preview.title': 'プルリクエストをローカルで試す',
  'feature.pr-preview.body':
    '他人のプルリクエストを — フォークからのものも含めて — 何もコミットせずに動かせます。API トークンも 2 つ目のリモートも要りません。head は、フォージがすでに公開している ref から取得します。GitHub、GitLab、Bitbucket、Azure DevOps、Gitea に対応。',
  'feature.mission-control.title': 'ミッションコントロール',
  'feature.mission-control.body':
    'ワークスペースのすべてのリポジトリを 1 画面に、手が要る順に並べます。まず停止中、次に同期が必要なもの、次に作業中、最後に静かなもの。',
  'feature.attributes.title': 'ファイル属性を、UI で',
  'feature.attributes.body':
    'git のなかで最も役に立つのに誰も書かないファイル。改行コードを全員のために一度で決め、コンフリクトしなくなる変更履歴、リリース用アーカイブに入らないフィクスチャ — そしてコンバーターが入っていれば、Word や PDF の読める差分まで。',
  'feature.languages.title': 'たぶん、あなたの言語も',
  'feature.languages.body':
    'ボタンだけの申し訳程度の翻訳ではなく、解説まで含めたインターフェイス全体です。アラビア語とヘブライ語はレイアウトが反転し、グラフ、差分、パス、ターミナルは左から右のまま — コードが読まれる向きがそちらだからです。',
  'feature.security.title': 'あなたの秘密情報はあなたのもの',
  'feature.security.body':
    'バックエンドはありません。トークンと金庫のエントリーは OS のキーチェーンで暗号化されます — そして何のためかを伝えられ、あなたが承諾するまで、そのキーチェーンには何も触れません。'
}
