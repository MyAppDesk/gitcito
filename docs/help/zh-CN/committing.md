---
title: 提交
category: 处理变更
order: 31
summary: 消息风格、模板、共同作者，以及检查器。
keywords: commit 提交 message 消息 composer 编辑器 conventional gitmoji ticket 工单 amend 修补 template 模板 co-author 共同作者 linter 检查器 undo 撤销 reset 重置
---

# 提交

## 消息风格

在设置里挑一种；编辑框会随之调整。

| 风格 | 长这样 |
|---|---|
| **Conventional** | `feat(api)!: add rate limiting`——带一个类型下拉框 |
| **Gitmoji** | `✨ add rate limiting`——带一个表情选择器 |
| **Gitmoji + Conventional** | `✨ feat(api): add rate limiting`——表情选择器*和*类型下拉框 |
| **工单** | `ABC-123: add rate limiting`——由分支名预填 |
| **纯文本** · **自动** | 你写什么就是什么；自动模式让 AI 来决定形态 |
| **原始人** · **俳句** | 就是字面上听起来的那个意思 |

![由提交模板预填的编辑框](../../screenshots/commit-template.webp)

### Gitmoji

[Gitmoji](https://gitmoji.dev) 在主题前加一个表情，让历史一眼就能读懂：🐛 修复、
✨ 新功能、🔥 删除。两种 gitmoji 风格下，表情按钮都紧挨着主题输入框。它会打开
**全部 75 个官方 gitmoji**，可按表情、按 `:代码:`（gitmoji-cli 用户输入的那种）
或按你所用语言中的含义搜索。

**Gitmoji + Conventional** 让类型和表情保持同步。选一个类型，表情随之而来；改了
类型，表情也跟着变——除非表情是你亲手选的（比如给 `fix` 选了 🚑️），这种永远
不会被覆盖。

| 类型 | Emoji | 类型 | Emoji |
|---|---|---|---|
| `feat` | ✨ | `test` | ✅ |
| `fix` | 🐛 | `build` | 📦️ |
| `docs` | 📝 | `ci` | 👷 |
| `style` | 🎨 | `chore` | 🔧 |
| `refactor` | ♻️ | `revert` | ⏪️ |
| `perf` | ⚡️ | | |

AI 也按同样的格式书写。如果模型漏了表情，或用 `:shortcode:` 作答，主题会在填入
输入框之前被纠正。

其他工具写成 `:sparkles: add login` 的提交，会在图谱、提交详情和历史视图中
**显示**为 `✨ add login`。

限制：

- 选择器总是写入 **unicode** 表情，从不写 `:shortcode:`。
- shortcode 只在显示时转换。提交本身不会被改写，在历史中搜索时匹配的是提交时的
  原文。
- 只认 gitmoji：以其他表情开头的主题保持原样。
- 如果仓库的 `commit-msg` 钩子用标准 Conventional 预设运行 commitlint，开头的
  表情会被拒绝。这是钩子的规则，不是 Gitcito 的：请把 commitlint 配置为支持
  gitmoji，或在该仓库使用纯 Conventional。

## 编辑框替你做的事

- <kbd>↑</kbd> <kbd>↓</kbd> 可以调出你**最近用过的消息**。
- **共同作者选择器**会从仓库自己的贡献者中挑人，添加 `Co-authored-by:` 尾注。
- `commit.template` / `.gitmessage` 会**预填**消息，并剥掉注释行。
- 在合并、拣选（cherry-pick）或还原期间，消息会按 git 的做法**预先填好**。
- 草稿按仓库分别**保留**，所以切换标签页永远不会弄丢一条消息。

## 检查器

一个实时、不拦路的检查：标题长度（带字数计数器）、结尾的句号、非祈使语气或小写开头的标题、正文行过宽。它只给提示，从不设卡——它不会阻止你提交。

## 修补

修补会用当前已暂存的内容重写上一个提交。Gitcito 会先把原有的消息显示出来，这样你是在编辑，而不是在重打一遍。

在提交图的某一行上，**修补提交…**对 HEAD 做的就是同一件事：加载完整的消息，把编辑框切换到修补模式并聚焦。已经推送过的 HEAD 仍然可以修补，但 Gitcito 会警告：更新远程将需要一次强制推送。

**撤销提交…**是它的孪生兄弟，面向尚未推送的 HEAD：mixed 重置到父提交，工作树的更改保留，消息回到编辑框里。首个提交有一条专门的路径，留下的是一个尚未诞生的分支，而不是毁掉那些文件。

**另请参阅：** [暂存](staging.md) · [吸收](absorb.md) · [变更日志生成器](changelog.md)
