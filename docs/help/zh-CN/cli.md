---
title: 命令行
category: 工作区工具
order: 93
summary: `gitcito .` 打开仓库——而 `gitcito doctor` 什么都不打开就给出答案。
keywords: cli 命令行 终端 shim path 安装 打开 文件夹 单实例 doctor status repos commit-check config editor completions wait core.editor blame show search 动词 退出码 ci hook
---

# 命令行

从终端提出的问题有两类，`gitcito` 两类都回答。

第一类是*“把这个给我看看”*——你在一个克隆里，有东西需要看，而这个应用正是看它的
地方。这类调用会打开窗口，并尽可能停在你问的那个位置上。

第二类是*“现在就告诉我”*——一个钩子、一个 CI 任务，或者身处管道中的你，想要的是
答案和退出码，而不是窗口。这类调用根本不会启动应用：它们写到标准输出，然后让开。

```sh
gitcito .                        # 打开当前文件夹
gitcito blame src/api.ts -l 84   # …并停在那一行的 blame 上
gitcito doctor                   # 不开窗口：检查仓库，失败则以 1 退出
```

## 安装

命令面板（<kbd>⌘K</kbd>）→ **将 'gitcito' 命令安装到 PATH**。在 macOS 上，它会把一个
小小的 shim 软链接到 `/usr/local/bin` 或 `/opt/homebrew/bin`，只有当两者你都不可写时
才请求管理员权限。在 Linux 上它会进入 `~/.local/bin`，完全不需要权限。再次运行同一条
命令即可卸载。Windows 目前尚未支持。

然后，按需：

```sh
gitcito completions zsh >> ~/.zshrc     # 或 bash，或 fish
```

## 打开东西

| 命令 | 打开 |
|------|------|
| `gitcito [路径]` | 仓库（默认为当前目录） |
| `gitcito open <名称>` | 按**标签页名称**打开仓库 —— `gitcito open api` |
| `gitcito diff` | 工作区改动 |
| `gitcito graph` | 提交图 |
| `gitcito show <ref>` | 某个提交 —— `HEAD~2`、标签、短哈希 |
| `gitcito blame <文件>` | 文件的 blame；加 `-l 84` 直接落到某一行 |
| `gitcito search <查询>` | 代码搜索，查询词已填好 |
| `gitcito stack`、`stash`、`reflog`、`conflicts`、`todos`、`chat`、`settings` | 对应面板 |
| `gitcito ci`、`clean`、`bisect`、`absorb`、`snapshots`、`insights`、`terminal` | ……等等 |

`gitcito help verbs` 会打印完整列表。三个选项对所有动词都有效：`-n <名称>` 设置标签页
的显示名，`-g <分组>` 把它放进分组标签页（必要时创建），`-l <n>` 指定行号。

Gitcito 是**单实例**的：应用已打开时再运行 `gitcito`，请求会交给那个窗口，而不是启动
第二份副本。已经打开的路径——无论是标签页还是分组内——会被**聚焦**，而不是复制一份。
还不是仓库的目录同样会打开，并给出“在此初始化仓库”的入口。

## 在终端里回答

这些命令打印结果后退出。不会开窗口，应用甚至不需要在运行。

### `gitcito status`

分支、跟踪关系、领先/落后、工作区、储藏，以及——如果仓库提供了的话——
[`.gitcito.json` 里的推送清单](repo-settings.md)。工作区存在冲突时以 1 退出，所以
`gitcito status || echo 被阻塞` 是可用的。

### `gitcito doctor [--fix]`

运行与[仓库配置](repo-settings.md)面板相同的检查：Node 版本、子模块、LFS、
`core.hooksPath`、必需文件。**任一检查失败即以 1 退出**——这正是重点：仓库声明的
规则，如果只有开着图形界面的人才看得到，价值就有限：

```yaml
- run: gitcito doctor          # 在 CI 中，放在一切昂贵步骤之前
```

`--fix` 会应用 doctor 知道怎么做的修复（初始化子模块、`lfs pull`、设置
`core.hooksPath`、从示例文件复制一份），然后重新检查。它绝不会执行配置文件提供的命令
——修复集合是封闭的。

警告不会让运行失败。警告的意思是 doctor 无法判定某件事，而不是某件事出了错；因为警告
而让构建失败，会让这个文件的采用成本高得不值。

### `gitcito commit-check [文件]`

检查一条提交信息。不带参数时读取 `.git/COMMIT_EDITMSG`；`-m "…"` 检查一段字符串。它
知道仓库声明了什么：当 `.gitcito.json` 列出了 scope 时，未知 scope 是**错误**；没有
列出时，它只是风格建议。挂到钩子里：

```sh
# .husky/commit-msg
gitcito commit-check "$1"
```

### `gitcito config init | show | check`

`init` 读取仓库，并从已有的东西中提出一份 `.gitcito.json`——`.nvmrc`、`.gitmodules`、
有 `.env.example` 却没有 `.env`、历史里一直在用的提交 scope。`--dry-run` 只打印不写入。
`show` 打印当前文件；`check` 校验它并列出任何会被丢弃的字段。

### `gitcito repos [过滤词]`

Gitcito 知道的每个仓库——先是打开的标签页，然后是最近使用的——连同它所在的分组。
`--paths` 只输出裸路径，一行一个，便于脚本使用：

```sh
cd "$(gitcito repos --paths api | head -1)"
```

## 把 Gitcito 当作 git 的编辑器

```sh
gitcito editor install
```

会把 `core.editor` 和 `sequence.editor` 设为 `gitcito --wait`。此后 `git commit`
（不带 `-m`）、`git commit --amend`、`git tag -a` 和 `git rebase -i` 都会在 Gitcito 中
打开它们的文件，而不是 vim，并带上字符计数和与提交编辑器相同的提交信息提示。

![git 需要编辑器时 Gitcito 打开的界面](../../screenshots/cli-edit.webp)

关键在于**等待**二字：git 正卡在那个对话框上。所以

- **保存并继续**会把文件写回，git 继续往下走。
- **取消**会写入一个空文件，git 将其读作*中止*。
- 以其他任何方式关闭对话框——Esc、点击背景、退出 Gitcito——都算取消。让终端永远等下去，
  远比让人重打一遍信息糟糕。

加上 `--local` 可只作用于一个仓库，用 `gitcito editor uninstall` 撤销。

## 它不会做的事

- **终端动词不会修改仓库。** `doctor --fix` 是唯一的例外，而它的修复是一份固定清单，
  不是配置文件可以扩充的东西。
- **`repos` 只读。** 设置文件属于正在运行的应用；CLI 只读取，绝不写入。
- **已安装应用不认识的动词会被忽略**，而不是拒绝——较新的 shim 配上较旧的应用，仍然会
  把仓库打开。
- **Windows 还没有 shim。** 所有动词都已实现，缺的只是安装路径。

**另见：**[工作区、标签页与分组](workspaces.md) ·
[仓库配置](repo-settings.md) · [提交](committing.md)
