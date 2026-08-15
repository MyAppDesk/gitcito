---
title: 堆叠分支
category: 分支与手术
order: 43
summary: 一串彼此依赖的分支，带级联式重新堆叠。
keywords: stack 堆叠 stacked branches 分支 graphite restack 重新堆叠 dependent 依赖 chain 链 parent 父级 PR per level 每层
---

# 堆叠分支

一个堆叠就是一串分支，其中每一个都建立在下面那个之上：`main → api → ui`。评审三个小 PR，好过评审一个巨大的。

![一个分支堆叠](../../screenshots/branch-stack.webp)

Gitcito 会自下而上地展示这个堆叠，并标出每一层的提交数，还让你**每层开一个 PR**，各自以它的父分支为目标，而不是 `main`。

## 重新堆叠

当下层的某个分支变了——比如你处理了 `api` 上的评审意见——它上面的每个分支现在都建立在错误的基底上。**重新堆叠**会用 `rebase --onto` 对整条链做级联变基，这样父分支的重写就不会把提交重复塞进它的子分支里。

## 这些链接存在哪儿

父级链接存在 **git config** 里，所以它们跟着仓库走，而且重新克隆之后依然健在。没有任何东西寄存在某个服务上。

**另请参阅：** [交互式变基](rebase.md) · [托管平台与拉取请求](hosting.md)
