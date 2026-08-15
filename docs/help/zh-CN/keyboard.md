---
title: 键盘与快捷键
category: 从这里开始
order: 2
summary: 值得学的那几个键，以及怎么重新绑定它们。
keywords: shortcuts 快捷键 keyboard 键盘 keys 按键 cheatsheet 速查表 rebind 重新绑定 hotkeys palette 命令面板
---

# 键盘与快捷键

在任何地方按 <kbd>?</kbd> 都能调出速查表。

![快捷键速查表](../../screenshots/cheatsheet.webp)

## 值得学的那几个

| 按键 | 作用 |
|---|---|
| <kbd>⌘K</kbd> | [命令面板](search.md)——分支、提交、文件、各种操作 |
| <kbd>⌘⇧F</kbd> | 在工作区里[搜索代码](search.md) |
| <kbd>⌘⇧V</kbd> | [保险库](vault.md) |
| <kbd>⌘O</kbd> / <kbd>Ctrl+O</kbd> | 打开一个仓库 |
| <kbd>⌘,</kbd> / <kbd>Ctrl+,</kbd> | 打开设置 |
| <kbd>⌘F</kbd> | 在你正在读的文件或差异里查找 |
| <kbd>⌘T</kbd> / <kbd>Ctrl+T</kbd> | 打开新标签页的仓库或分组选择器 |
| <kbd>⌘W</kbd> / <kbd>Ctrl+W</kbd> | 关闭当前标签页——一个标签页都不剩时，关的就是窗口 |
| <kbd>⌘1</kbd>–<kbd>⌘9</kbd> / <kbd>Ctrl+1</kbd>–<kbd>Ctrl+9</kbd> | 按位置切换到某个标签页 |
| <kbd>⌘⇧T</kbd> | 重新打开最近关闭的标签页 |
| <kbd>?</kbd> | 这份速查表 |

## 不用鼠标也能走动

| 在哪里 | 按键 |
|---|---|
| 提交图 | <kbd>↑</kbd> <kbd>↓</kbd> 或 <kbd>j</kbd> <kbd>k</kbd> |
| 文件列表（提交、进行中的改动、贮藏） | 同上 |
| [时光机](time-machine.md) | <kbd>←</kbd> <kbd>→</kbd>，按住 <kbd>⇧</kbd> 一次走十格，<kbd>Home</kbd>/<kbd>End</kbd> |
| [任务中心](mission-control.md) | <kbd>↑</kbd><kbd>↓</kbd>，<kbd>Enter</kbd> 打开，<kbd>f</kbd>/<kbd>p</kbd> 获取/拉取，<kbd>/</kbd> 过滤 |
| 提交消息输入框 | <kbd>↑</kbd> <kbd>↓</kbd> 翻出你最近写过的消息 |

## 重新绑定

**设置 → 快捷键**。核心导航快捷键（命令面板、搜索代码、保险库、打开仓库、设置）
都可以重新绑定，带冲突检测，也可以逐条重置。

上面那些固定快捷键不可重新绑定，而且它们也会被拒绝作为_目标_：应用会先于查询
你的绑定去响应 <kbd>⌘T</kbd>、<kbd>⌘W</kbd>、<kbd>⌘1</kbd>–<kbd>⌘9</kbd>、
<kbd>⌘⇧T</kbd>、<kbd>⌘S</kbd>、<kbd>⌘Z</kbd>、<kbd>⌘⇧Z</kbd> 和 <kbd>⌘F</kbd>，
所以指派到这些键上的快捷键看起来设好了，却永远不会触发。挑中其中之一，编辑器
会直接告诉你，而不是照单全收。

![设置里可重新绑定的快捷键](../../screenshots/settings-shortcuts.webp)

**另请参阅：** [命令面板与搜索](search.md)
