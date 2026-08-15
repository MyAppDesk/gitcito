---
title: 签名提交
category: 恢复与保护
order: 61
summary: GPG、SSH 或 X.509 签名，每个提交都带一个验证徽章。
keywords: 签名 提交签名 验证 徽章 信任 密钥 sign signing gpg ssh x509 verified signature badge trust
---

# 签名提交

按仓库打开签名（**设置 → 仓库齿轮**）：GPG、SSH 或 X.509，用你挑的那把密钥。Gitcito
会为该仓库写入 `commit.gpgsign`、`gpg.format` 和 `user.signingkey`——也就是任何其他
工具都会读的那套配置。

| | |
|---|---|
| ![签名列，浅色](../../screenshots/signed-commits-light.webp) | ![签名列，深色](../../screenshots/signed-commits-dark.webp) |

提交图会多出一个专门的、可调整顺序的**签名列**：

| 徽章 | 含义 |
|---|---|
| **已验证** | 来自一把 git 信任的密钥的有效签名 |
| **未验证** | 签了名，但那把密钥未知或未经校验 |
| **已过期** | 签名或它的密钥已经过期 |
| *（什么都没有）* | 未签名 |

标签也可以签名——见[标签](tags.md)。

**另请参阅：** [安全与机密](security.md)
