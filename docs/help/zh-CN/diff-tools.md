---
title: 外部差异与合并工具
category: 分支与手术
order: 43
summary: 把文件交给 Kaleidoscope、Beyond Compare、Meld，或者你本来就在用的任何工具——Gitcito 读的是 git 自己那份工具清单。
keywords: difftool mergetool external 外部 diff 差异 merge 合并 kaleidoscope beyond compare meld kdiff3 p4merge araxis opendiff filemerge vimdiff winmerge diff.tool merge.tool orig backup 备份
---

# 外部差异与合并工具

Gitcito 的[差异查看器](diffs.md)和[三栏解决器](conflicts.md)应付得了大多数日子。有些日子它们应付不来：一个 4000 行的生成文件、一次需要同时看四栏的合并，或者干脆就是那个你用了十年、读起来比任何新工具都快的老伙计。

**设置 → 通用 → 外部差异与合并工具。**

## 这是 git 的清单，不是我们的

Gitcito 自己不维护任何表格。下拉框里的内容就是 `git difftool --tool-help` 和 `git mergetool --tool-help`，所以：

- git 在你机器上已经找到的工具排在前面；它认识但找不到的排在后面，标着*未安装*。
- **自定义工具不需要任何额外支持就能用。** 如果你有

  ```sh
  git config --global difftool.mine.cmd 'mycompare "$LOCAL" "$REMOTE"'
  ```

  那么 `mine` 就会像任何内置工具一样出现在下拉框里。
- 你的选择会被写进**全局 git 配置里的 `diff.tool` 和 `merge.tool`**——也就是你的终端读的那两个键。在这里设好，命令行上的 `git difftool` 就是同样的行为。在那边设好，Gitcito 也会照单接收。

git 开箱就认识大约三十种工具，包括 Kaleidoscope、Beyond Compare、Meld、KDiff3、P4Merge、Araxis、DiffMerge、WinMerge、FileMerge、VS Code 以及 vim 一家。

## 这些动作出现在哪里

| 界面 | 动作 |
|---------|--------|
| [提交编辑器](committing.md)里一个被改动的文件 | **在 \<工具\> 中查看差异**——工作区对索引 |
| [冲突解决器](conflicts.md) | **在 \<工具\> 中合并**——完整的三方合并 |

这两个入口只在确实配置了工具时才出现；一个没配置的 `git difftool` 只会报错，而一个按下去没反应的按钮比没有按钮更糟。

## 工具开着的时候会发生什么

Gitcito 会等它关闭。这是有意为之——`git mergetool` 只在工具退出*之后*才暂存那个已解决的文件，这样才有一个真实的结果可以汇报——这也是为什么按钮会转圈，而不是立刻返回。

app 的其余部分保持响应：这些操作跑在那把「把普通 git 操作串行化」的每仓库锁之外，所以一个开着去吃午饭的合并工具，不会把它背后的标签页冻住。

外部合并成功之后，git 会自己暂存那个文件，Gitcito 则关掉解决器并刷新。如果你没保存就关掉了工具，git 会照实说，什么也不会变。

## `.orig` 文件

`git mergetool` 默认会在已解决的文件旁边留下一个 `<file>.orig` 备份——这是 git 的行为，不是 Gitcito 的。设置里的开关写的是 `mergetool.keepBackup`；把它关掉，一个已解决的文件就什么都不会留下。

## 限制

- **只处理工作区的差异。** 编辑器里的那个入口比较的是你现在手上的东西和索引。用外部工具比较两个历史提交并没有接上线——那种事用内置的[差异查看器](diffs.md)或者[比较](merging.md)。
- **一次一个文件。** 没有「把每个改动过的文件都 diff 一遍」的批量操作。
- **Gitcito 从不安装任何东西。** 标着*未安装*的工具仍然可以选中，因为你装上之后 git 或许就找得到它了——但在你装上之前，它只会失败。
