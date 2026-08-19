---
title: 本地 CI
category: 同步与多仓库
order: 58
summary: 在推送之前，用 act 在本地运行仓库的 GitHub Actions。
keywords: 本地 CI local ci act actions 工作流 workflow 运行器 runner docker 流水线 pipeline 测试 test 推送前 before push nektos
---

# 本地 CI

推送—等待—红叉—修复—再推送的循环，每转一圈就浪费十分钟。有了
[act](https://nektosact.com)，同样的工作流可以在你机器上的 Docker 容器里运行，
由 Gitcito 来驱动：选一个工作流，按下运行，看着 CI 本来会打印的那份日志——
在任何东西离开你的机器之前。

![本地 CI](../../screenshots/local-ci.webp)

## 是一项集成，不是内置运行时

Gitcito 刻意**不**捆绑 act 或 Docker——一个拖着容器运行时的应用，恰恰是 git
客户端的反面。这是一项需要主动开启的集成：在**设置 → 集成**（或对话框本身）里
启用它，Gitcito 会检测已安装的组件并引导你完成剩下的步骤——`brew install act`、
一个正在运行的 Docker 守护进程，就绪。三个条件全部满足之前什么都不会运行：
已启用、act 已安装、Docker 可连接。

## 它能做什么

- 按 `name:` 列出 `.github/workflows` 下的每一个工作流。
- **运行**用 act 针对你的**工作区**执行工作流——包括未提交的更改，而这正是
  重点：在提交之前测试，而不是在推送之后。
- 输出实时流入对话框；**停止**会终止运行。退出码 0 显示**通过**，其余情况
  显示**失败**并附上退出码。

## 局限

- act 是对 GitHub 运行器非常出色的模仿，但并不完美：需要 GitHub 托管服务、
  密钥或特殊运行器镜像的 action 可能表现不同。本地的绿灯是有力的证据，
  不是保证。
- 每个仓库同一时间只能有一次运行；启动新的运行会取消前一次。
- 只支持按工作流运行——挑选单个作业、矩阵或事件是 act 的地盘；需要传参数时，
  请在[集成终端](terminal.md)里运行它。
- 首次运行会下载运行器镜像——第一次会慢一些。

**另请参阅：** [托管与拉取请求](hosting.md) · [集成终端](terminal.md)
