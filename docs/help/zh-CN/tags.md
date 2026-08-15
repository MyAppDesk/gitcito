---
title: 标签与发布
category: 同步与多仓库
order: 53
summary: 轻量、附注或签名的标签——本地的和远程的。
keywords: tag 标签 tags annotated 附注 signed 签名 release 发布 push 推送 delete 删除 remote 远程
---

# 标签与发布

可以从任意一个提交上创建标签：

| 种类 | 什么时候用 |
|---|---|
| **轻量标签** | 一个指针。给自己做个记号足够了 |
| **附注标签** | 带一条说明、一个作者和一个日期——一次发布本该是这样 |
| **签名标签** | 附注标签，再加上一个 GPG/SSH 签名 |

![创建标签：名称、可选的说明，以及要不要签名](../../screenshots/create-tag.webp)

标签可以在本地删除、推送出去，也可以在远程上删除。远程标签不必先全部获取下来就能浏览。

在 GitHub 上，已经发布的**版本**（release）会连同一个变更日志页面列在侧边栏里——见[托管](hosting.md)。要起草那份说明，用[变更日志生成器](changelog.md)。

**另请参阅：** [签名提交](signing.md) · [变更日志生成器](changelog.md)
