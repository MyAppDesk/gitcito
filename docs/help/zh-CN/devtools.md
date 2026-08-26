---
title: Flutter DevTools
category: 工作区工具
order: 93
summary: 网络视图、时间线、Inspector 和内存分析器，就在 Gitcito 的一个标签页里。
keywords: devtools flutter dart 网络 network 时间线 inspector 内存 分析器 webview 内嵌 面板 vm service
---

# Flutter DevTools

DevTools 里已经有网络视图、时间线、widget inspector 和内存分析器，而且它本身就是一个
由你自己机器提供的 Flutter web 应用。所以 Gitcito 一样都不重写，也不自己去跟 Dart VM
Service 对话：它只是发现地址并把它嵌进来。

![在 Gitcito 标签页里打开的 DevTools](../../screenshots/devtools.webp)

VM service 一起来，`flutter run` 就会打印这一行：

```
The Flutter DevTools debugger and profiler on iPhone 16 Pro is available at:
http://127.0.0.1:9100?uri=http://127.0.0.1:53412/uJ8k=/
```

启动会话会盯着自己的输出找它，调试工具栏上就会多出一个按钮。点一下，DevTools 就在
自己的标签页里打开，一个会话一个 —— 同时跑两个应用，就是两个 DevTools。

**热重启会公布一个新地址**，只要会话还活着，标签页就跟着换。会话结束之后，标签页
留着最后那个地址，而它通常已经死了：关掉它，从新的运行里重新打开 DevTools。

## 它被允许做什么

这个内嵌视图拴着短绳，因为这个应用手里有凭据：

- **只允许 loopback。** `127.0.0.1`、`localhost`、`::1`。用别的地址挂载会被拒绝，
  跳转到别的地址同样会被拒绝。
- **没有 preload，没有 node integration，开启上下文隔离。** 这个页面没有任何通往
  Gitcito 的桥。
- **链接在你真正的浏览器里打开**，用普通窗口，而不是在面板里。

## 限制

- **它就是 DevTools，不是我们的东西。** 那个版本能做什么，面板就能做什么；它做不到
  的，我们也做不到。没有什么 Gitcito 风味的网络视图。
- **只有 Flutter 会这样公布自己。** 普通的 Dart 程序会打印 VM service 的 URL，但不会
  打印 DevTools 地址，所以按钮不会出现。
- **面板空白说明应用已经停了。** DevTools 是*正在运行的应用*提供的；应用退出，地址
  也就不再响应。

**另见：** [运行与调试](launch.md)
