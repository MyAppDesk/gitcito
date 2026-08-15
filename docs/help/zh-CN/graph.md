---
title: 提交图
category: 仓库与历史
order: 10
summary: 读懂历史：泳道、引用、列、筛选与多选。
keywords: 提交图 graph 历史 history 提交 commits 泳道 lanes 分支 branches 合并 merges 列 columns 筛选 filter 线性 linear first-parent
---

# 提交图

分支、合并以及章鱼式合并都被规规矩矩地画了出来，浅色深色皆可。渲染是按窗口进行的，所以一个有十万个提交的仓库，滚动起来和只有一百个提交的一样顺。

| | |
|---|---|
| ![提交图，浅色](../../screenshots/graph-light.webp) | ![提交图，深色](../../screenshots/graph-dark.webp) |

## 四处走动

- <kbd>↑</kbd> <kbd>↓</kbd>（或 <kbd>j</kbd> <kbd>k</kbd>）移动选中项。
- <kbd>⌘</kbd>／<kbd>Ctrl</kbd>+点击把一个提交加入或移出**多选**；<kbd>⇧</kbd>+点击选取一个区间。选中若干个之后右键，即可把它们拣选（cherry-pick）到当前分支上、把连续的一段压缩成一个、导出一份合并后的补丁，或者复制它们的 SHA。
- 在你**最近一次获取或拉取**中到达的提交会被标为新提交。

## 让它只显示你想看的

- **线性视图**（first-parent）隐藏所有被合并进来的内容，只留下主干。
- **按路径筛选**：右键点击一个文件或文件夹 → *按此路径筛选图*，于是只有改动过它的提交还亮着。

![被筛选到只剩一条路径的图](../../screenshots/graph-path-filter.webp)

- **列**：分支、消息、作者、日期、SHA、签名和部署这几列都可以显示、隐藏、调整宽度和重新排序。
- **样式**：设置 → 主题 → **图**——泳道配色（8 套内置、自定义，或由 AI 生成）、拐角样式、行密度和线条粗细，并带一个实时的迷你图预览。

![带实时预览的图样式设置](../../screenshots/settings-graph.webp)

## 提交详情

选中一个提交会显示它改动的文件（按树状或平铺）、作者、SHA、共同作者，以及它的签名。`#123` 引用和 `@mentions` 会自动链接到你的托管方。

![逐个查看提交详情](../../screenshots/clip-commit-details.webp)

**另请参阅：** [追溯与文件历史](blame.md) · [搜索](search.md) · [时光机](time-machine.md)
