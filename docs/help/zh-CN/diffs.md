---
title: 差异与预览
category: 阅读变更
order: 20
summary: 分栏视图、词级高亮、图片差异与文件预览。
keywords: 差异 对比 diff 分栏 并排 split side-by-side 词级 空白 whitespace 图片差异 image diff 预览 preview markdown docx pdf
---

# 差异与预览

## 阅读一份差异

| 开关 | 作用 |
|---|---|
| **统一 ↔ 分栏** | 想比较时用并排，想通读时用上下堆叠 |
| **词级高亮** | 只高亮被编辑行内真正改动的词元——旧的标红，新的标绿 |
| **忽略空白** | 隐藏重新缩进，让真正的变更浮出水面 |
| <kbd>⌘F</kbd> | 在差异内查找，可逐个跳到上一个／下一个 |

![带词级高亮的分栏差异](../../screenshots/split-diff.webp)

每份差异的上方都有一条[语义摘要](semantic-diff.md)——按符号而不是按行告诉你改了什么。

## 图片差异

被修改的图片会得到一次真正的比较：并排放置，或者拖动一个滑动手柄在改动前后之间切换。

![图片差异](../../screenshots/image-diff.webp)

## 什么都能预览

**预览**模式渲染文件本身，而不是显示它的源码：Markdown、Word（`.docx`）、Excel（`.xlsx`）、PDF、视频、音频、图片，其余一切则以语法高亮的代码呈现。

![Markdown 预览](../../screenshots/markdown-preview.webp)

## 文件标签页

左侧边栏的**文件**标签页浏览的是工作区本身，文件夹上带有状态徽标（新增／修改／删除），汇总其内部的情况。

![带预览的文件标签页](../../screenshots/file-tree.webp)

![文件夹徽标汇总了每个文件夹内部改了什么](../../screenshots/tree-badges.webp)

**另请参阅：** [语义差异](semantic-diff.md) · [暂存](staging.md)
