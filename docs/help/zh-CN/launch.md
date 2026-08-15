---
title: 运行与调试（launch.json）
category: 工作区工具
order: 91
summary: 不必离开 Gitcito 就能运行你的 VS Code 启动配置。
keywords: launch.json 运行 调试 run debug vscode 启动配置 configs 任务 tasks preLaunchTask input 后台 background
---

# 运行与调试

Gitcito 会读取你的 `.vscode/launch.json`——根目录那一份以及任何嵌套的，用分隔线分组——并在集成终端里运行你挑中的那条配置。

![启动配置选择器与悬浮工具栏](../../screenshots/launch-configs.webp)

- VS Code 的**变量会被解析**（`${workspaceFolder}` 及其同伴）。
- 配置里的 **`preLaunchTask`** 会先跑。
- **`${input:…}`** 的值会在启动前交互式询问（`promptString` 与 `pickString`）。
- **`isBackground`** 任务（监视器、开发服务器）以分离方式运行，因此永远不会挡住启动。

一条悬浮工具栏给你**暂停／恢复、重启、停止**，并可在多个运行中的会话之间切换。

在**设置 → 通用 → 启用 launch.json** 中打开它。**启动**按钮会出现在 Git／文件标签页旁边。

**另请参阅：** [终端](terminal.md)
