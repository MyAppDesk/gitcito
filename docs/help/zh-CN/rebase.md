---
title: 交互式变基
category: 分支与手术
order: 42
summary: 重新排序、压缩、fixup、改写消息、编辑或丢弃——全靠拖。
keywords: interactive 交互式 rebase 变基 squash 压缩 fixup reword 改写 drop 丢弃 edit 编辑 autosquash todo 待办
---

# 交互式变基

`git rebase -i` 的那份 todo 清单，变成一份你可以拖动的列表。

![交互式变基编辑器](../../screenshots/interactive-rebase.webp)

| 动作 | 意味着 |
|---|---|
| **pick** | 原样保留 |
| **reword** | 保留改动，编辑消息 |
| **squash** | 折进上面那个提交，两条消息合并 |
| **fixup** | 折进上面那个提交，丢掉这条消息 |
| **edit** | 在这里停下，好让你修补 |
| **drop** | 把这个提交扔掉 |

拖动行来重新排序。编辑器绝不会在终端里打开——todo 由 Gitcito 替你写好。

## 一键 autosquash

- **把已暂存的变更 fixup 进这个提交**会替你创建那个 `fixup!`。
- **从这里开始 autosquash** 会把每个 `fixup!` / `squash!` 都折进它的目标。

如果你手上不是一个而是一堆评审修正，[吸收](absorb.md)会算出每个变更块属于哪个提交，省得你自己来。

> 变基会重写历史。已经推送出去的东西将需要一次强制推送，而评审过它的人会想看看[自那以后改了什么](range-diff.md)。

**另请参阅：** [吸收](absorb.md) · [自那以后改了什么](range-diff.md) · [恢复](recovery.md)
