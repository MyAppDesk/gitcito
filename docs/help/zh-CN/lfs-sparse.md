---
title: LFS、稀疏检出与补丁
category: 同步与多仓库
order: 55
summary: 大文件、部分检出，以及把改动当成文件搬来搬去。
keywords: lfs large file storage 大文件 sparse checkout 稀疏检出 cone partial clone 部分克隆 patch 补丁 am apply
---

# LFS、稀疏检出与补丁

## Git LFS

![LFS 管理器](../../screenshots/lfs.webp)

它会检测 `git-lfs` 有没有装、这个仓库用不用它、以及哪些模式被跟踪了。文件列表会区分哪些**已下载**、哪些还只是个**指针**，你可以就地拉取或者清理。

## 稀疏检出

![锥形模式的稀疏检出](../../screenshots/sparse-checkout.webp)

锥形（cone）模式：勾上你真正会动的那几个顶层文件夹，其余的就从你的工作区里退场，同时仍然留在历史里。在一个你只负责两个包的 monorepo 上，这很有用。

克隆时还会提供**部分克隆**（`--filter=blob:none`）这个选项，这样你就不用去下载那些永远不会打开的 blob。

## 补丁

- 把一个提交（或多选的一批）**导出**为 `.patch`。
- 把一个补丁**应用**到工作区（`git apply`），或者作为提交应用（`git am`）。

两者都在工具菜单里。

**另请参阅：** [工作树与子模块](worktrees.md)
