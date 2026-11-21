---
title: 环境检查
category: 从这里开始
order: 6
summary: Gitcito 在自身安装之外所依赖的东西——git、LFS、原生终端、git 的 credential helper、GitHub CLI 和文件监视——在一处检查。
keywords: 环境 environment 诊断 doctor 检查 git 版本 lfs node-pty 终端 基础 shell credential helper store gh github cli 作用域 workflow inotify max_user_watches
---

# 环境检查

有些故障根本与仓库无关，而是来自机器：git 太旧，无法用配置档登录；终端悄悄退回了基础
模式；GitHub CLI 的登录无法推送 workflow 文件。它们都会在之后以含糊的错误出现，夹在别的
事情中间。**设置 → 环境**（命令面板中也可用 *Settings: Environment*）会提前检查它们。

[仓库诊断](repo-settings.md)回答的是另一个问题：*这个仓库*能否按照其 `.gitcito.json`
的要求在这里构建。环境检查针对的是应用本身，对每个仓库都一样。

![设置中的环境检查](../../screenshots/settings-environment.webp)

## 检查什么

| 行 | 绿色表示 | 黄色或红色表示 |
|----|----------|----------------|
| **Git** | `PATH` 中有 git 2.31 或更新版本 | 低于 2.31：[配置档](profiles.md)的账号无法为 fetch 和 push 登录。缺失：安装 git 之前什么都无法工作 |
| **Git LFS** | 已安装 `git lfs` | 未安装。只有把文件存放在 LFS 的仓库需要它 |
| **终端** | 原生终端已加载 | [终端](terminal.md)以基础模式运行：没有颜色、不能调整大小、不能运行全屏程序 |
| **Credential helper** | git 有用于 HTTPS 密码的 helper——全局或针对特定主机（`gh auth setup-git` 所设置的） | 没有 helper，因此 Gitcito 之外的 git 每次都会询问。或者是以明文保存的 `store`。参见 [Credential helper](credentials.md) |
| **GitHub CLI** | `gh` 已使用 `workflow` 作用域登录 | 已登录但没有该作用域：GitHub 会拒绝任何修改 `.github/workflows` 的推送 |
| **文件监视**（Linux） | inotify 上限至少为 65,536 | 上限较低时，打开几个大型仓库就会耗尽，新文件夹将不再刷新状态 |

不适用的行会被省略：未安装或未登录时的 GitHub CLI，以及 macOS 和 Windows 上的文件监视。

## 修复发现的问题

有修复办法时，该行会把它显示为带复制按钮的命令。例如
`gh auth refresh -h github.com -s workflow` 会补上缺少的作用域，一行 `sysctl` 会提高
inotify 上限。**此页面从不自行运行任何东西。** 有些修复需要 `sudo` 或会改动全局配置，运行
前应由你阅读确认。运行后点击 **重新检查**。

## 限制

- 它检查的是应用从自身进程能看到的内容。只在你的终端里修改 `PATH` 的 shell 配置文件可能
  让两者不一致。
- GitHub CLI 这一行反映的是 `gh` 自己的登录，而不是 **设置 → 集成** 中连接的账号。它们是
  不同的凭据。那里缺少 `workflow` 作用域时，会表现为推送被拒绝。
- 它报告已安装的内容，不会安装或升级任何东西。
