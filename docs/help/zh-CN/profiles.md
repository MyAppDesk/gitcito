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

## 按仓库绑定

一个仓库可以**绑定到某个配置档**上，这样对它做后台获取时，用的永远是那个正确的
账号来认证——哪怕你此刻正在看的是属于另一个账号的仓库。

令牌存放在你的[操作系统钥匙串](security.md)里，绝不会进设置文件。

**另请参阅：** [安全与机密](security.md) · [代码托管](hosting.md)
