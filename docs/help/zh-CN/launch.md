---
title: 运行与调试（launch.json）
category: 工作区工具
order: 91
summary: 不必离开 Gitcito 就能运行你的 VS Code 启动配置。
keywords: launch.json 运行 调试 run debug vscode 启动配置 configs 任务 tasks preLaunchTask input 后台 background compound compounds stopAll serverReadyAction 并行会话
---

# 运行与调试

Gitcito 会读取你的 `.vscode/launch.json`——根目录那一份以及任何嵌套的，用分隔线分组——并在集成终端里运行你挑中的那条配置。

![启动配置选择器与悬浮工具栏](../../screenshots/launch-configs.webp)

- VS Code 的**变量会被解析**（`${workspaceFolder}` 及其同伴）。
- 配置里的 **`preLaunchTask`** 会先跑。
- **`${input:…}`** 的值会在启动前交互式询问（`promptString` 与 `pickString`）。
  `pickString` 会以真正的选择器展示选项并预选默认值；标记为 `password` 的
  `promptString` 输入会被掩码。
- **`isBackground`** 任务（监视器、开发服务器）以分离方式运行，因此永远不会挡住启动。
- **compound** 会把每个成员作为**各自的并行会话**运行 — 在一个以 compound 命名的
  拆分终端里，每个成员一个窗格，和 VS Code 的调试会话完全一样。配置 `stopAll: true`
  时，停止一个成员会停止全部。
  多个成员共享的任务只会在成员启动前、于独立窗格中**运行一次** —
  版本号升级的询问只出现一次，而不是每个成员一次。
  该窗格成功后会自动关闭，失败时保持打开。
- 支持 **`serverReadyAction`**：当会话输出匹配配置的模式时，宣告的 URL 会在浏览器中
  打开（`openExternally`；`debugWithChrome` / `debugWithEdge` 也只是打开浏览器 —
  Gitcito 无法附加调试器）。

![一个 compound 正在运行两个并行会话](../../screenshots/launch-compound.webp)

![预选默认值的 ${input} 选择器](../../screenshots/launch-input.webp)

一条悬浮工具栏给你**暂停／恢复、重启、停止**，并可在多个运行中的会话之间切换。

在**设置 → 通用 → 启用 launch.json** 中打开它。**启动**按钮会出现在 Git／文件标签页旁边。

compound 成员显示为 *compound › 成员*，重启只会重启该成员。

Gitcito 有意**不做**的事：它在真实终端里运行你的程序，但它不是调试器 — 没有断点、
没有变量检查、没有 Debug Adapter Protocol。仅 attach 的配置在带有 `preLaunchTask`
时可用（任务就是全部工作）；纯 attach 没有可运行的内容。

**另请参阅：** [终端](terminal.md)
