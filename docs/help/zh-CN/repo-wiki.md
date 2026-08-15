---
title: 仓库百科（AI）
category: AI
order: 81
summary: 一份自动生成的代码库导览，其中每一句论断都注明出自哪个文件。
keywords: wiki 百科 documentation 文档 generated 生成 codebase 代码库 overview 概览 dependencies 依赖 architecture 架构 export 导出 docs
---

# 仓库百科

把它对准一个仓库，它就会写出一份简短的百科，讲清楚这套代码库是怎么回事。

## 仓库卡片

- 按字节数统计的**语言构成**。
- **技术栈**——框架以徽章形式呈现（Next、Angular、Electron、Tailwind、Django……）。
- 直接从你的清单文件里读出来的**依赖**（`package.json`、`Cargo.toml`、`go.mod`、
  `pyproject.toml`、`pubspec.yaml`、`Gemfile`……），并按架构角色分组。脚手架类的
  东西——类型桩、加载器、lint 插件——会先被过滤掉，而且只有项目真正声明过的包才
  可能出现。
- **一张模块依赖图**，从源码解析而来（JS/TS、Python、Go、Rust、Dart、Ruby、
  C/C++、PHP），并对着仓库自己的文件做解析，所以一个来自外部包的 import 绝不会
  变成一条假的边。

## 写出来的页面

Gitcito 会从仓库跟踪的文件里规划出为数不多的几个页面——文档和清单文件优先，然后
是改动最频繁的那些——再依据每个页面所覆盖的文件把它写出来。

**每一句陈述都注明它出自哪个文件**，而没有任何文件能支撑的论断会被驳回，不会发出
来。这些页面是并行写、一次性存的，所以一次失败的生成绝不会把一份好好的百科覆盖
掉。如果这份百科是在一个较早的提交上写成的，它会告诉你。

## 导出

**导出到 docs/** 会把整份东西以互相链接的 Markdown 写进 `docs/wiki/`——于是它可以
被提交、在 PR 里评审，并在你的代码托管平台上阅读。

看起来像密钥的文件绝不会被发送。

**另请参阅：** [AI 功能](ai.md)
