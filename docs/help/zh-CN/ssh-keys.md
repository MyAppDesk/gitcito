---
title: SSH 密钥
category: 同步与多仓库
order: 57
summary: 为什么你的令牌对 git@ 远程毫无用处，以及怎么看出是哪把密钥在失败。
keywords: SSH 密钥 代理 指纹 口令 公钥 权限被拒 上传 ssh key keys agent ssh-add ssh-keygen ed25519 publickey permission denied fingerprint passphrase upload github known_hosts
---

# SSH 密钥

**设置 → 安全 → SSH 密钥。**

## 它为什么和令牌放在一起

Gitcito 要认证两样不同的东西，而人们很自然地以为它们是同一样：

| | 由什么认证 |
|---|---|
| **托管方 API**——仓库、拉取请求（PR）、议题、CI 检查 | 你的[令牌](hosting.md) |
| 走 `https://` 的 git 传输 | 你的令牌，注入到 URL 里 |
| 走 **`git@…`** 的 git 传输 | **你的 SSH 密钥，经由系统的 ssh** |

像 `git@github.com:me/api.git` 这样的远程从来碰不到令牌。Git 把连接交给 `ssh`，而
`ssh` 压根没听说过什么个人访问令牌。这不是什么边缘情况——同事帮你建好了仓库、
`.gitmodules` 里用的是 `git@` 形式的 URL、公司禁用了 HTTPS 认证、或者托管方是自建的
GitLab，你拿到的就是这个。

而当它出问题时，ssh 只会说 `Permission denied (publickey)`，别的一个字也没有。技术上
没错，作为建议毫无用处。

![~/.ssh 里的每把密钥，及其类型、指纹，以及 agent 是否持有它](../../screenshots/ssh-keys.webp)

## 这一节告诉你什么

在 `~/.ssh` 里找到的每把密钥都会显示它的类型、长度、指纹和注释，外加那个能解释大多数
突发故障的事实：

**在 agent 中** / **不在 agent 中**。 agent 没有持有的密钥认证不了任何东西，而除非你
告诉过操作系统另作安排，agent 重启后就会忘光自己持有的内容。「昨天还好好的」通常就是
这个原因。

## 你在这里能做什么

| 操作 | 它实际执行什么 |
|--------|--------------|
| **复制公钥** | 把 `.pub` 那一行放到剪贴板上，可以直接粘到任何托管方 |
| **加入 agent** | `ssh-add`（在 macOS 上带 `--apple-use-keychain`，这样它能挺过重启） |
| **上传到 GitHub** | 用当前配置档的令牌调用 `POST /user/keys` |
| **生成密钥** | `ssh-keygen -t ed25519`，注释用你的 git 邮箱 |
| **测试连接** | `ssh -T git@<host>`，并翻译成一句人话 |

**测试连接**之所以存在，是因为 ssh 自己的回答会误导人：GitHub 明明认证成功了，*然后*
以一个失败的退出码退出，因为它不提供 shell。Gitcito 读的是消息而不是退出码，并把原始
输出显示在下面，好让你核对它的判读。

## 把限制说清楚

- **上传只支持 GitHub。** GitLab、Bitbucket 和 Azure DevOps 只有*复制公钥*，外加一个
  直达它们密钥设置页的链接。在另外三家上注册密钥没有实现，而那个按钮也不会假装能做到。
- **生成绝不覆盖。** `~/.ssh` 里已经存在的名字会被拒绝。悄悄覆盖掉一把私钥，等于吊销
  了你对所有信任它的东西的访问权，而任何确认对话框都无法让那件事变得可恢复。
- **Gitcito 不保存口令。** 生成密钥或加入 agent 时你会输入一次；它被传给
  `ssh-keygen`/`ssh-add` 之后就被丢弃。让它跨重启保留下来是操作系统钥匙串的活，通过
  `ssh-add` 完成。
- **不编辑 `~/.ssh/config`**，没有主机别名，也不支持按仓库选择密钥。那些东西住在你的
  ssh 配置里，而 Gitcito 不去动那个文件。

## 什么永远不会离开你的机器

**Gitcito 从不读取、显示或传输私钥。** 这一节列出的是公钥的那一半和指纹。唯一会被发到
别处去的，是你明确按下**上传**的那把公钥——而它去的是 GitHub，用的是你自己的令牌，
并且在一次点名了指纹的确认之后才发出。

另请参阅：[安全与机密](security.md) · [托管与拉取请求](hosting.md)
