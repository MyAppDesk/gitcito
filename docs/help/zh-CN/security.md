---
title: 安全与机密
category: 安全
order: 70
summary: 遮蔽、防护、钥匙串——以及 Gitcito 拒绝去做的事。
keywords: 安全 机密 密钥 遮蔽 钥匙串 令牌 保护分支 大文件 隐私 security secrets masking keychain safeStorage tokens protected branch large file guard privacy
---

# 安全与机密

Gitcito **没有后端**。唯一的网络请求发往你的 Git 托管方；如果你打开了 AI 功能，
还会发往你的 AI 供应商。

![安全设置](../../screenshots/settings-security.webp)

## 机密遮蔽

`.env*`、`*.pem`、`*.key`、`id_rsa`、`credentials.*` 这类文件里的值，在差异（对比）、
文件和追溯（blame）视图中会渲染成 `KEY=••••••`，这样屏幕共享或截图就泄露不了它们。
Apple 的签名材料也算：`*.mobileprovision`、`*.provisionprofile`、`*.p12`
以及 App Store Connect 的 `*.p8` 密钥。`*.cer` 不算——证书本就是公开的。

这**只影响显示**：它从不修改文件，也从不改变你暂存的内容。每个视图都有一个眼睛开关
可以显示原值。`.env.example`、`.sample` 和 `.template` 被当作模板，而不是机密。

![一个 .env 文件，所有值都被遮蔽，旁边是显示开关](../../screenshots/secret-masking.webp)

## 在你造成损失之前的防护

| 防护 | 触发时机 |
|---|---|
| **机密文件** | 提交看起来像凭据的东西时——附带一键*忽略并取消跟踪* |
| **大文件** | 提交超大的二进制对象时（阈值在 设置 → 安全 中） |
| **构建垃圾** | 提交 `xcuserdata/`、`DerivedData/` 或 `.DS_Store` 时——同样提供一键*忽略并取消跟踪* |
| **保护分支** | 直接向 `main`/`master` 提交，或强制推送它们时 |
| **已跟踪的机密** | 推送一个*跟踪着*机密文件的仓库时——每个会话警告一次 |

## 操作系统钥匙串

令牌和[保险库](vault.md)条目用你的操作系统钥匙串加密（Electron 的 `safeStorage`），
而不是用设置文件里的某个密钥。

**在你点头之前，什么都不会碰钥匙串。** 在系统自己的权限对话框出现之前，Gitcito 会
先说明要存的是什么、它做不到什么（一个应用只能读回它自己创建的那条记录——你的其他
密码它够不着），以及拒绝也完全没问题：那样令牌只在本次会话的内存中存活，保险库保持
关闭，你也可以稍后在 **设置 → 安全 → 操作系统钥匙串** 里打开它。

全新安装在真正需要存东西之前，会发出**零**次钥匙串调用。

## 安全地分享

[安全分享](secure-share.md)可以把设置、保险库条目或整个工作区导出成一个**加密包**
——只有你勾选了那个选项，机密才会被包含进去。

**另请参阅：** [保险库](vault.md) · [安全分享](secure-share.md)
