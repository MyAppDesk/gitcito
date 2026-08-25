// Website chrome in zh-CN. Keys mirror en.mjs; anything missing falls back to English.
export const zhCN = {
  'nav.handbook': '手册',
  'nav.roadmap': '路线图',
  'nav.github': 'GitHub',
  'nav.sponsor': '赞助',
  'nav.download': '下载',

  'foot.license': 'MIT 许可 · 由 <a href="https://myappdesk.dev">MyAppDesk</a> 用 💜 打造',
  'foot.source': '源码',
  'foot.roadmap': '路线图',
  'foot.reportIssue': '报告问题',
  'foot.sponsor': '赞助',

  'meta.title': 'Gitcito——git 的全部，配上一个让你看得见的界面',
  'meta.description':
    '一个完全由 vibe coding 写成的 Git 客户端。免费。提交图、逐行暂存、变基、工作树、子模块、LFS——外加几件你不知道 git 还能做的事。',

  'hero.title': 'git 的全部，<br /><em>配上一个让你看得见的界面</em>',
  'hero.lede':
    '提交图、逐行暂存、变基、工作树、子模块、LFS。<br />那些寻常的事，都做到位了——外加几件你不知道 git 还能做的事。',
  'hero.download': '下载适合你平台的版本',
  'hero.source': '查看源码',
  'hero.terms': '免费 · MIT · v{version}',
  'hero.graphAlt': 'Gitcito 的提交图',

  'features.title': '几件你不知道 git 还能做的事',
  'features.sub':
    '这些都不是你该用 Gitcito 的理由——上面那份清单才是。它们存在，只是因为 git 早就知道答案；Gitcito 不过是去问了一声。',

  'ordinary.title': '你会得到什么',
  'ordinary.sub':
    '一个完整的客户端，不是一个子集。全都已经做好、写进文档，今天就在应用里——那些寻常的事，而用 git 的绝大部分时间正是在做这些事。',
  'ordinary.graph': '有真实泳道的提交图，为超长历史做了窗口化',
  'ordinary.staging': '细到单行的暂存',
  'ordinary.conflicts': '三栏冲突解决器，会告诉你哪一侧是哪一侧',
  'ordinary.rebase': '拖一拖就完成的交互式变基',
  'ordinary.stacks': '堆叠分支，带级联式重新堆叠',
  'ordinary.recovery': 'Reflog、WIP 快照、引导式二分查找',
  'ordinary.prs': 'GitHub、GitLab、Bitbucket 和 Azure DevOps 上的拉取请求',
  'ordinary.terminal': '集成终端——真正的 PTY',
  'ordinary.launch': '直接从 <code>.vscode/launch.json</code> 运行 &amp; 调试',
  'ordinary.ai': '可选的 AI，会引用它读过的行',
  'ordinary.themes': '内置主题，浅色与深色，外加 AI 生成的主题',
  'ordinary.languages': '全面翻译，手册也在内——阿拉伯语和希伯来语会镜像整个布局',
  'ordinary.conflictAlt': '冲突解决器',

  'download.title': '下载',
  'download.sub': '最新版本：<strong>v{version}</strong>。每一个构建都由 CI 发布。',
  'download.cli':
    '也可以在终端里用 <code>gitcito .</code> 打开一个仓库——见<a href="{cli}">命令行</a>。',
  'download.macNote': 'Apple 芯片 &amp; Intel · 已签名并公证',
  'download.winNote': '安装程序（x64）',
  'download.linuxNote': 'AppImage · deb',
  'download.forOs': '下载适用于 {os} 的版本',

  'handbook.title': '一本 {pages} 页的手册，内置在应用里',
  'handbook.sub': '每个功能都讲清楚——在应用里离线可读，这里也能读。',

  'sponsor.title': '赞助 Gitcito',
  'sponsor.body':
    '免费、MIT、没有后端、没有遥测、没有任何东西要向你追加销售——所以也没有什么可买的。赞助用来支付签名版 macOS 构建所需的 Apple Developer 证书、手册和翻译。报告缺陷的价值一样大。',
  'sponsor.cta': '在 GitHub 上赞助',

  'doc.titleSuffix': 'Gitcito 手册',
  'doc.filter': '筛选页面…',
  'doc.filterLabel': '筛选页面',
  'doc.edit': '在 GitHub 上编辑此页',
  'doc.improve': '在 GitHub 上改进这份翻译',

  'feature.conflict-radar.title': '冲突雷达',
  'feature.conflict-radar.body':
    '在合并任何分支<strong>之前</strong>，先看清哪些分支会冲突。合并发生在对象数据库内部——不检出，不动工作区，事后没有任何东西要收拾。',
  'feature.recovery.title': 'WIP 快照',
  'feature.recovery.body':
    '整棵工作树——连同未跟踪的文件——按定时器拍下快照，并且<strong>在每次破坏性操作之前</strong>再拍一次。后悔的丢弃，一次恢复就能找回。',
  'feature.commit-edit.title': '编辑任意提交',
  'feature.commit-edit.body':
    '错别字在三周前？直接<strong>在旧提交里</strong>改文件——上面的一切自动重放，整条级联在任何 ref 移动之前先给你预览。',
  'feature.ai.title': '自带模型',
  'feature.ai.body':
    '同时用多个 AI 账号——OpenAI 密钥写提交信息，Claude 负责聊天，本地 Ollama 干剩下的。模型列表从各家实时拉取；已登录的 CLI 也能直接用，不必再配 API 密钥。',
  'feature.semantic-diff.title': '语义差异',
  'feature.semantic-diff.body':
    '<code>startServer</code> → <code>bootServer</code>，而不是一堵 400 行的红绿墙。真正的 tree-sitter 解析，不是正则。',
  'feature.range-diff.title': '自那以后改了什么',
  'feature.range-diff.body':
    '他们对你审阅过的分支做了强制推送。看看哪些提交被重写、被丢弃或被新增——旧位置从 reflog 里白拿。',
  'feature.repo-chat.title': '仓库聊天',
  'feature.repo-chat.body':
    '向这个仓库提问，答案会引用它读过的代码行。把它该看的文件和提交固定住——从提交图、文件树，或磁盘上的任何位置拖进来。',
  'feature.absorb.title': '吸收',
  'feature.absorb.body':
    '把你的评审修正暂存起来，让 blame 把每个变更块送回引入它的那个提交，作为一条 <code>fixup!</code>。',
  'feature.time-machine.title': '时光机',
  'feature.time-machine.body':
    '拖动滑块，看着仓库变化：文件出现、移动、又回来。HEAD 一步不动，你未提交的活儿也毫发无损。',
  'feature.timelapse.title': '延时回放',
  'feature.timelapse.body':
    '把仓库的一生当成动画重放一遍——还能导出成视频，就在页面里录制，不用装任何编码器。',
  'feature.pr-preview.title': '本地预览拉取请求',
  'feature.pr-preview.body':
    '不提交任何东西，就把别人的拉取请求跑起来——复刻来的也行。不需要 API 令牌，也不用加第二个远程：head 直接从托管方本就公开的 ref 上拉取，GitHub、GitLab、Bitbucket、Azure DevOps 或 Gitea 都行。',
  'feature.mission-control.title': '任务中心',
  'feature.mission-control.body':
    '工作空间里的每一个仓库都在同一屏上，按谁更需要你来排序：先是被卡住的，然后是待同步的，再是脏的，最后是安静的。',
  'feature.attributes.title': '文件属性，带界面',
  'feature.attributes.body':
    'git 里最有用、却没人愿意写的那个文件。行尾一次性给所有人定好，变更日志不再冲突，测试夹具不进发布包——装上转换器之后，Word 和 PDF 的差异也能读。',
  'feature.languages.title': '你的语言，多半有',
  'feature.languages.body':
    '不是把按钮糊弄一下的半吊子翻译——整个界面，连解释都在内。阿拉伯语和希伯来语会镜像布局，而图、差异、路径和终端保持从左到右，因为代码就是那个方向读的。',
  'feature.security.title': '你的机密仍然是你的',
  'feature.security.body':
    '没有后端。令牌和保险库条目用你系统的钥匙串加密——而且在告诉你用途、你也点头之前，什么都不会碰那个钥匙串。',
  'feature.cli.title': '带有真正命令行的 Git 图形客户端',
  'feature.cli.body':
    '`gitcito .` 打开仓库，`gitcito blame src/api.ts -l 84` 直接定位到那一行，而 `gitcito doctor` 根本不打开窗口——它检查仓库的要求，并以 CI 能读懂的退出码结束。'
}
