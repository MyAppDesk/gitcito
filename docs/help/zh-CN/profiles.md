---
title: 配置档
category: 个性化
order: 101
summary: 把工作用的身份和令牌，与其余一切分开。
keywords: profile 配置档 profiles identity 身份 git user email 邮箱 tokens 令牌 accounts 账号 switch 切换
---

# 配置档

一个配置档把一份 **Git 身份**（姓名和邮箱）和它的**集成令牌**捆在一起。切换配置档
时两者一起变——提交的作者信息是对的，API 调用用的也是对的账号。

同一台机器上既有工作仓库又有私人仓库，或者你手上有两个 GitHub 账号时，它就派上
用场了。

![一个配置档：一边是 git 身份，另一边是它的集成令牌](../../screenshots/settings-profiles.webp)

## 每个配置文件有自己的账号

除了令牌，配置文件还可以在 设置 → 集成 中**关联**机器上已有的登录——来自 git 的
credential helper 或 GitHub CLI。一个关联只属于一个配置文件：新配置文件一开始是
未连接的，已被其他配置文件持有的账号会被拒绝，因此两个配置文件可以并存两个
GitHub（或 Azure DevOps）账号。参见[托管](hosting.md)。

## 按仓库绑定

一个仓库可以**绑定到某个配置档**上，这样对它做后台获取时，用的永远是那个正确的
账号来认证——哪怕你此刻正在看的是属于另一个账号的仓库。

令牌存放在你的[操作系统钥匙串](security.md)里，绝不会进设置文件。

**另请参阅：** [安全与机密](security.md) · [代码托管](hosting.md)
