---
title: 运行与调试（launch.json）
category: 工作区工具
order: 91
summary: 不必离开 Gitcito 就能运行你的 VS Code 启动配置。
keywords: launch.json 运行 调试 run debug vscode 启动配置 configs 任务 tasks preLaunchTask input 后台 background compound compounds stopAll serverReadyAction 并行会话 hot reload hot restart device simulator emulator run target flutter metro expo vite nodemon vitest jest mocha ava wrangler dotnet watch adb simctl avd xcodebuild capacitor
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
如果工具栏挡住了你需要的内容，可以拖动手柄把它移开 — 位置会被记住，双击手柄可让它回到居中位置。

Gitcito 有意**不做**的事：它在真实终端里运行你的程序，但它不是调试器 — 没有断点、
没有变量检查、没有 Debug Adapter Protocol。仅 attach 的配置在带有 `preLaunchTask`
时可用（任务就是全部工作）；纯 attach 没有可运行的内容。

## 热操作 —— 「重启」旁边的快车道

![从调试工具栏发出的热重载](../../screenshots/launch-hot.webp)

大多数开发运行时本来就能按一个键重新加载：`flutter run` 按 **r**，Metro 按
**r**，nodemon 按 **rs ⏎**，Vitest 按 **a** 重跑整套测试。为了同样的效果去重启
启动配置是慢路：它会杀掉进程、重跑每一个 `preLaunchTask`，还把应用的状态丢掉。

所以 Gitcito 会读取一个配置真正启动的命令 —— 顺着 `npm run dev` 一直读到你
`package.json` 里的脚本 —— 再把该运行时的按键放到调试工具栏上。按下按钮就是把
这个按键写进会话的标准输入，和你自己在终端里敲一模一样。

| 运行时 | 按钮 | ⋯ 菜单里 |
|--------|------|----------|
| Flutter（`flutter run`） | 热重载 `r`、热重启 `R` | 调试绘制、性能浮层、切换平台、DevTools |
| Expo | 重新加载 `r` | 开发者菜单、调试器 |
| Metro / React Native | 重新加载 `r` | 开发者菜单、调试器 |
| Vite（dev、serve、preview） | 重启服务器 `r ⏎` | 在浏览器打开、显示地址、清空控制台 |
| nodemon | 重启 `rs ⏎` | — |
| Vitest（watch 模式） | 重跑全部 `a`、重跑失败 `f` | 更新快照 |
| Jest（`--watch`） | 重跑全部 `a`、重跑失败 `f` | 仅变更文件、更新快照 |
| Mocha（`--watch`） | 重跑 `rs ⏎` | — |
| AVA（`--watch`） | 重跑全部 `r ⏎`、更新快照 `u ⏎` | — |
| `dotnet watch` | 强制重启 `Ctrl+R` | — |
| Wrangler（`wrangler dev`） | 在浏览器打开 `b` | DevTools、本地/远程、清空控制台 |

自己就会重新加载的运行时不会得到按钮 —— `node --watch`、`ng serve`、
`tsc --watch`、`cargo watch`、`next dev`、webpack-dev-server。一个发出没人读的
按键的按钮比没有按钮更糟，因为它看起来像是生效了。

**限制。** 识别是文本层面的：它匹配命令行里的程序名，所以通过 Gitcito 读不到的
包装脚本启动开发服务器的配置什么也拿不到。按键也没有回执 —— 按钮闪一下，真正
的答复是进程自己的输出。暂停或已结束的会话不接受输入，按钮会变灰。

**猜错的时候**，在配置里直接说明：

```json
{
  "name": "API (watch)",
  "type": "node-terminal",
  "command": "./scripts/dev.sh",
  "gitcito": { "hotActions": [{ "label": "Reload", "send": "r", "icon": "reload" }] }
}
```

`send` 会原样写出 —— 对于等待回车的 CLI，请以 `\n` 结尾。
`icon` 可选：`reload`, `restart`, `rerun`, `failed`, `snapshot`, `menu`, `debugger`,
`browser`, `clear`, `paint`, `perf`, `platform`, `devtools`, `urls`。
空的 `hotActions` 数组会关闭该配置的按钮。

## 运行目标 —— 配置要跑在哪台设备上

![在 LAUNCH 标签旁边选择运行目标](../../screenshots/launch-device.webp)

一个构建移动应用的配置，必须被告知要在哪里运行。这个选择不只属于 Flutter ——
React Native、Expo、Capacitor 和 xcodebuild 同样接受一个目标，而且各写各的。
所以 Gitcito 只问一次，就在 **LAUNCH** 标签旁边，再把答案写成那个配置的运行时
能读懂的形式。只有当仓库里确实有配置能接受设备时，选择器才会出现。

**列表从哪来** —— 机器上有哪些 SDK 工具就问哪些，并行发问：

| 工具 | 提供 | 何时询问 |
|------|------|----------|
| `flutter devices` / `flutter emulators` | 全部，且已归一化 | 目录里有 `pubspec.yaml` 时 |
| `xcrun simctl` | iOS 模拟器，运行中的和冷的 | 在 macOS 上 |
| `adb devices` | Android 手机和已启动的模拟器 | 始终 |
| `emulator -list-avds` | 仍未启动的 Android 模拟器 | 始终 |

同一个模拟器最多会被其中三个同时报告，因此条目按平台和名称合并；打平时 Flutter
胜出，因为 `flutter run -d` 要的正是它的 id。未安装的工具列在菜单底部 —— 一份很
短的列表应该自己解释自己。

**这个选择做了什么：**

| 家族 | 写成 |
|------|------|
| Flutter | `-d <id>` |
| React Native iOS | `--udid <id>` |
| React Native Android | `--deviceId=<id>` |
| Expo `run:ios` / `run:android` | `--device <id>` |
| Capacitor / Ionic | `--target <id>` |
| xcodebuild | `-destination id=<id>` |
| 其它任何情况 | 仅环境变量 |

每个启动的配置还会在环境里拿到 `GITCITO_DEVICE_ID`、`GITCITO_DEVICE_NAME` 和
`GITCITO_DEVICE_PLATFORM`；目标是真实 Android 设备时还会有 `ANDROID_SERIAL`。
正是这一点，让包装脚本、Gradle 任务或者一句裸 `adb` 都能打到同一台手机，而
Gitcito 不必改写任何命令。

**启动一台冷设备。** *未运行* 下面的条目，选中即启动：`flutter emulators
--launch`、`xcrun simctl boot`（外加 Simulator 窗口），或者以分离方式运行的
`emulator -avd` —— 这样退出 Gitcito 不会把你的 Android 模拟器一起带走。

**限制。** 已经写明设备的配置 —— 显式的 `-d`、`--simulator`、Dart-Code 的
`deviceId` —— 会原样保留：选择器绝不覆盖作者写下的东西。需要 shell 引号的 id 会
退回到环境变量，而不是冒着把命令行弄坏的风险。菜单会按你的配置能触及的范围过滤，
所以纯 Android 的仓库永远不会给你列出 iPhone。列表是一张快照：插上手机后按
**刷新设备**。

选择按仓库记住，并在该设备不复存在时被忘掉。

**另请参阅：** [终端](terminal.md)
