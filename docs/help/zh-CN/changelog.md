---
title: 变更日志生成器
category: 处理变更
order: 34
summary: 把两个引用之间的 conventional 提交变成一份分好组的变更日志。
keywords: changelog 变更日志 release notes 发布说明 conventional commits 提交 generate 生成 CHANGELOG
---

# 变更日志生成器

给它两个引用——默认是**最新的标签 → HEAD**——它就会把两者之间的提交变成一份变更日志，按 Conventional Commit 类型分组。

![变更日志生成器](../../screenshots/changelog-gen.webp)

- **破坏性变更**排在最前面，不管它们原本属于哪个类型。
- 然后是 Features、Fixes、Performance 等等。
- 不遵循任何约定的提交会落到 **Other** 里，而不是被丢掉——一份会悄悄弄丢提交的变更日志，比一份乱糟糟的更糟。

把结果复制走，或者**直接前置写入 `CHANGELOG.md`**。

> 让这东西真正有用的，是你用 [Conventional 风格](committing.md)写消息。生成器的水准，不会高过它读到的那些标题。

**另请参阅：** [提交](committing.md) · [托管平台与拉取请求](hosting.md)
