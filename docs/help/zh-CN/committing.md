---
title: 提交
category: 处理变更
order: 31
summary: 消息风格、模板、共同作者，以及检查器。
keywords: commit 提交 message 消息 composer 编辑器 conventional gitmoji ticket 工单 amend 修补 template 模板 co-author 共同作者 linter 检查器 undo 撤销 reset 重置
---

# 提交

## 消息风格

在设置里挑一种；编辑框会随之调整。

| 风格 | 长这样 |
|---|---|
| **Conventional** | `feat(api)!: add rate limiting`——带一个类型下拉框 |
| **Gitmoji** | `✨ add rate limiting`——带一个表情选择器 |
| **工单** | `ABC-123: add rate limiting`——由分支名预填 |
| **纯文本** · **自动** | 你写什么就是什么；自动模式让 AI 来决定形态 |
| **原始人** · **俳句** | 就是字面上听起来的那个意思 |

![由提交模板预填的编辑框](../../screenshots/commit-template.webp)

## 编辑框替你做的事

- <kbd>↑</kbd> <kbd>↓</kbd> 可以调出你**最近用过的消息**。
- **共同作者选择器**会从仓库自己的贡献者中挑人，添加 `Co-authored-by:` 尾注。
- `commit.template` / `.gitmessage` 会**预填**消息，并剥掉注释行。
- 在合并、拣选（cherry-pick）或还原期间，消息会按 git 的做法**预先填好**。
- 草稿按仓库分别**保留**，所以切换标签页永远不会弄丢一条消息。

## 检查器

一个实时、不拦路的检查：标题长度（带字数计数器）、结尾的句号、非祈使语气或小写开头的标题、正文行过宽。它只给提示，从不设卡——它不会阻止你提交。

## 修补

修补会用当前已暂存的内容重写上一个提交。Gitcito 会先把原有的消息显示出来，这样你是在编辑，而不是在重打一遍。

在提交图的某一行上，**修补提交…**对 HEAD 做的就是同一件事：加载完整的消息，把编辑框切换到修补模式并聚焦。已经推送过的 HEAD 仍然可以修补，但 Gitcito 会警告：更新远程将需要一次强制推送。

**撤销提交…**是它的孪生兄弟，面向尚未推送的 HEAD：mixed 重置到父提交，工作树的更改保留，消息回到编辑框里。首个提交有一条专门的路径，留下的是一个尚未诞生的分支，而不是毁掉那些文件。

**另请参阅：** [暂存](staging.md) · [吸收](absorb.md) · [变更日志生成器](changelog.md)
