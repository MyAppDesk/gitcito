---
title: 钩子与 .gitignore
category: 工作区工具
order: 92
summary: 管理 git 钩子，并且不用手改文件就能忽略文件。
keywords: 钩子 hooks pre-commit commit-msg pre-push husky core.hooksPath gitignore 忽略 ignore 取消跟踪 untrack
---

# 钩子与 .gitignore

## 钩子

列出仓库里的每一个钩子（hook），看清哪些是真的、哪些还是 `.sample`，然后启用、停用、编辑或新建它们。

![钩子管理器](../../screenshots/hooks.webp)

Gitcito 会检测自定义的 **`core.hooksPath`**（husky 之流）以及 **pre-commit 框架**的配置，并在钩子不住在 `.git/hooks` 时告诉你——否则你会去编辑一个 git 根本不会运行的文件。

> 钩子对 Gitcito 的提交生效，和对 `git commit` 完全一样。失败的钩子会挡住这次提交，它的输出会随错误一起回来。

## 聪明的 .gitignore

右键点一个文件 → **忽略**，然后挑一个：

| 选项 | 写入 |
|---|---|
| 这个文件 | `path/to/file.log` |
| 所有 `*.ext` | `*.log` |
| 整个文件夹 | `path/to/folder/` |

![.gitignore 选择器](../../screenshots/gitignore-chooser.webp)

规则会写进**最近那个文件夹**的 `.gitignore`，或者写进仓库根目录，并且在你拍板之前实时预览那一行长什么样。已经被跟踪的文件，在同一个对话框里会多出一个**忽略并取消跟踪**。

**另请参阅：** [安全与机密](security.md) · [暂存](staging.md)
