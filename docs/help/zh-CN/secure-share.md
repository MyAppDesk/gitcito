---
title: 安全分享
category: 安全
order: 72
summary: 在多台机器之间搬运设置、保险库条目或整个工作区。
keywords: 安全分享 导出 导入 加密包 设置 工作区 迁移 机器 secure share export import bundle encrypted settings workspace transfer machine
---

# 安全分享

换一台新机器，通常意味着把一切重新输入一遍。安全分享把这些东西打成一个加密包，省掉
那一遍。

![把一个仓库的设置导出为加密包](../../screenshots/secure-share.webp)

![对整个工作区做同样的导出](../../screenshots/secure-workspace.webp)

## 能装些什么

| 部分 | 内容 |
|---|---|
| **设置** | 主题、布局、快捷键、偏好 |
| **保险库** | 全局机密和按仓库存放的机密 |
| **仓库** | 一个工作区里的仓库，导入时按远程地址或文件夹匹配 |

只有你**勾选了那个选项**，机密才会被包含进去。没勾的包里完全不含任何凭据。

## 导入

导入界面会在应用任何内容**之前**，逐节展示包里有什么；仓库则会与你已有的对上号——
先按远程 URL，再按文件夹——这样导入不会把整个世界重新克隆一遍。

**另请参阅：** [保险库](vault.md) · [安全与机密](security.md)
