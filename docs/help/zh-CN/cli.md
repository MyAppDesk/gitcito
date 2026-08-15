---
title: 命令行
category: 工作区工具
order: 93
summary: `gitcito .`——就像 `code .`，只不过是给 Git 用的。
keywords: 命令行 cli command line 终端 terminal 垫片 shim path 安装 install 打开文件夹 open folder 单实例 single instance
---

# 命令行

```sh
gitcito .                        # open this folder
gitcito ~/code/api               # …or that one
gitcito . -n "My API"            # with a display name
gitcito . -g "Work"              # inside a group tab
gitcito . -n "My API" -g "Work"  # both
```

## 安装那个垫片

命令面板（<kbd>⌘K</kbd>）→ **在 PATH 中安装 'gitcito' 命令**（macOS）。它会把一个小小的垫片符号链接到 `/usr/local/bin` 或 `/opt/homebrew/bin`，只有当两者你都没有写权限时才会索要管理员权限。再运行一次同一条命令即可卸载。

## 它的行为

- 如果这个路径**已经打开**——无论是作为一个标签页还是在某个分组里——Gitcito 会**聚焦过去**，而不是再开一个重复的。
- 如果它还不是一个 Git 仓库，它照样会打开，并给出「在此初始化仓库」的流程。
- `-g` 会把这个仓库加入同名分组，分组不存在就顺手建一个。
- Gitcito 是**单实例**的：应用已经开着时再运行 `gitcito`，请求会交给那个窗口，而不是启动第二份副本。

**另请参阅：** [工作空间、标签页与分组](workspaces.md)
