---
title: 仓库规则（.gitcito.json）
category: 工作区工具
order: 98
summary: 随仓库一起分发的团队规则——受保护分支、提交作用域、克隆所需的条件，以及推送前的清单。
keywords: gitcito.json 仓库配置 规则 doctor 体检 要求 受保护分支 作用域 scopes trailers 工单 追踪器链接 清单 上手 hooksPath node 子模块 lfs env example
---

# 仓库规则（`.gitcito.json`）

每个项目都带着一些从代码里看不出来的规则。*绝不要直接推送到 `release/*`。*
*提交作用域只有 `api`、`web` 和 `infra`。* *在任何东西能跑起来之前，你需要
Node 20、已检出的子模块，以及一份从 `.env.example` 复制来的 `.env`。* 这些规则
通常住在没人重读的 README 里、一次 CI 失败里，或者待得最久的那个人脑子里。

`.gitcito.json` 就是仓库把它们写下来的地方，好让工具据此行事。它位于仓库根目录，
像其他文件一样被提交，因此会随克隆一起分发：打开这个项目的每个人都拿到同一套规则，
新人在第一天就拿到，而不是在第一次被拒绝的推送时才知道。

这个文件完全可选。没有它的仓库表现和以前一模一样。

![仓库的 Config 标签页，显示 doctor 行和各个规则区块](../../screenshots/repo-config.webp)

## 在哪里编辑

工具栏工具旁边的齿轮 → **Config**。该编辑器会把文件写进你的工作区；它不会保存在
其他任何地方，所以请**提交它**，才能把规则分享给团队。

如果仓库还没有，**读取仓库**会根据已有的东西提议一份：`.nvmrc` 或
`engines.node`、`.gitmodules`、`.gitattributes` 里的 `filter=lfs`、旁边没有
`.env` 的 `.env.example`、你已经在本地保护的分支，以及最近 500 条提交标题一直在用
的作用域。在你保存之前不会写入任何东西。在终端里，`gitcito config init` 做同样的
事（见[命令行](cli.md)）。

## 文件里可以写什么

```json
{
  "version": 1,
  "protect": ["main", "release/*"],
  "links": {
    "tickets": [
      { "match": "\\b[A-Z][A-Z0-9]+-\\d+\\b", "url": "https://tracker.example.com/browse/$0", "label": "Jira" }
    ]
  },
  "commit": {
    "scopes": ["api", "web", "infra"],
    "ticketFromBranch": true,
    "trailers": ["Refs: {ticket}"]
  },
  "requires": {
    "node": ">=20",
    "hooksPath": ".husky",
    "submodules": true,
    "lfs": true,
    "files": [{ "path": ".env", "from": ".env.example", "why": "API 基础地址和一个开发用令牌" }]
  },
  "checklist": {
    "push": ["在预发环境跑一遍集成测试"]
  }
}
```

| 字段 | 作用 |
|---|---|
| `version` | 必须是 `1`。来自更新模式的文件会被整份忽略，而不是猜着解析。 |
| `protect` | 分支名，`*` 匹配任意字符。它们**叠加**在你本地保护的分支之上——见[受保护分支](repo-settings.md)。 |
| `links.tickets` | 一个正则表达式和一个 URL 模板。`$0` 是整个匹配，`$1`…`$9` 是它的分组。提交标题和正文里的匹配会变成链接。 |
| `commit.scopes` | 提交编辑器提供的作用域列表，取代自由文本输入。声明它们还会让 `gitcito commit-check` 把未知作用域从风格建议变成错误。 |
| `commit.ticketFromBranch` | 从分支名填入工单号（`feature/ABC-123-thing` → `ABC-123`）——但只在编辑器为空时，绝不会覆盖你正在输入的内容。 |
| `commit.trailers` | 追加到提交正文的行。`{ticket}` 和 `{branch}` 会被填充；占位符无内容可填的行会被丢弃，而不是写成半截。 |
| `requires.*` | 一个可用的克隆需要什么。每一项都会变成下面的一行 doctor 检查。 |
| `checklist.push` | 自由文本，每个会话在第一次推送前显示一次。 |

## Doctor

`requires` 正是回答*“我克隆下来了，但跑不起来”*的那部分。Gitcito 在你打开仓库时
检查它，有问题时会在状态栏显示一个听诊器标记。点击它会打开 Config 标签页并定位到
doctor 行；**再次检查**会重新运行。

| 检查 | 通过条件 | 修复方式 |
|---|---|---|
| `node` | 你 PATH 里的 `node` 满足声明 | — |
| `submodules` | 没有子模块处于未检出状态 | `git submodule update --init --recursive` |
| `lfs` | 已安装 git-lfs，且被跟踪的文件是真实内容而非指针文本 | `git lfs pull` |
| `hooksPath` | `core.hooksPath` 与声明的路径一致 | 设置 `core.hooksPath` |
| `files` | 文件存在 | 若 `from` 存在，则从它复制 |

两个刻意的限制。**警告**从不表示“坏了”——它表示 doctor 无法判定某件事（无法解析的
Node 版本声明会通过，而不是编造一个你无从下手的失败），而且警告不会让 CI 里的
`gitcito doctor` 失败。修复动作也从不由文件提供：上面这一组就是全部，在编译期即已
封闭。配置只交给它一个值——要复制的路径、`core.hooksPath` 的取值——绝不是一条命令。

复制文件从不覆盖：文件缺失本来就是这一行出现的全部原因。

## 提交

声明了 `commit.scopes` 之后，编辑器的作用域按钮会提供那份列表，而不是一个自由输入
框——这就是 `feat(renderer)` 和 `feat(rendererr)` 的差别。`ticketFromBranch` 和
`trailers` 负责填掉消息里机械的部分，而 `links.tickets` 会在任何展示提交的地方把
工单号还原成链接。

同样的规则在窗口之外也生效：`gitcito commit-check` 会读取这个文件，所以一个
`commit-msg` 钩子和 CI 强制执行的，正是编辑器建议的东西。见[命令行](cli.md)和
[提交](committing.md)。

## 推送前清单

`checklist.push` 会在一个会话的第一次推送前作为确认框显示，每项一行。它适合放真正
需要人来判断的事——*有人通知支持团队了吗？*——因为 Gitcito **绝不会替你检查这些**。
它们是提醒，不是关卡：读完就推送，或者取消。每个仓库每个会话只显示一次，因为每次
推送都弹的对话框就是没人会读的对话框。

## 为什么它伤不到你

这个文件随仓库而来，也就是来自写这个仓库的人。它被当作不可信内容对待，和一条提交
消息没有区别：

- **里面没有任何东西会被执行。** 没有任何字段可以携带命令，doctor 的修复动作是一份
  固定清单。
- **它只能增加限制。** `protect` 与你的本地列表取并集——仓库可以比你选的保护得更多，
  却绝不能劝你放弃保护某个分支。没有任何字段能关掉某项防护。
- **路径无法离开仓库。** 绝对路径、`..`、`~`、盘符以及任何触及 `.git` 的东西都会被
  拒绝，并且在字符串真正变成路径的那一刻再检查一次。
- **链接必须是 `http(s)`。** 别的都不会交给系统的 URL 打开器。
- **一切都有上限**——列表长度、字符串长度、模式长度——所以恶意仓库既没法把一堵墙的
  文字塞进对话框，也没法把一千个标签塞进面板。

坏字段会被丢弃，而不是致命错误。文件其余部分依然生效，被丢弃的内容会连同原因列在
Config 标签页的**已被 Gitcito 忽略**下。唯一的例外是无效 JSON 或未知的 `version`，
那时没有什么可挽救的。

## 它刻意不做的事

- **没有命令、没有脚本、没有钩子。** 那是[钩子](hooks.md)的职责，而钩子是你为每个
  克隆单独做的决定。
- **没有按分支或按人的规则。** 一个文件，一套规则。
- **它不替代 CI。** 清单只是文本；doctor 检查的是环境，不是你的工作。
- **它无法削弱任何东西。** Gitcito 的每一项防护依然由你掌握。

**另见：**[按仓库设置](repo-settings.md) · [命令行](cli.md) ·
[提交](committing.md) · [钩子与 .gitignore](hooks.md)
