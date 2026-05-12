🇺🇸 [English](./README.md)

# Astra Scoreboard

> 专为 CS2 赛事导播打造的实时数据面板与 OBS 叠加层。

[![Electron](https://img.shields.io/badge/Electron-41.5.1-47848F?logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19.2.0-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)

---

## 这是什么？

Astra Scoreboard 是一款面向 **CS2 赛事导播** 和 **OBS 直播者** 的桌面端软件。它通过 CS2 的游戏状态集成接口（GSI）直连游戏，实时获取比分、玩家数据、ADR、K/D 等信息，并渲染为简洁美观的直播叠加层。

无需手动改分，无需表格 juggling。打开软件，添加浏览器源到 OBS，数据自动同步。

---

## 下载

| 版本 | 文件 |
|------|------|
| 安装包 | `Astra Scoreboard Setup X.X.X.exe` |
| 绿色版 | `Astra Scoreboard_Portable.exe` |

> **仅支持 Windows 10/11**，无需额外运行环境。

---

## 快速上手

### 1. 连接 CS2（GSI）

**自动配置（推荐）**
1. 打开软件 → 进入 **Scoreboard** 页面。
2. 点击 **Auto Config GSI**。
3. 选择 CS2 的 `cfg` 文件夹：
   ```
   .../Counter-Strike Global Offensive/game/csgo/cfg
   ```
4. 软件自动写入 `gamestate_integration_astra_scoreboard.cfg`。
5. 如果 CS2 正在运行，**重启游戏**。

**手动配置**
在 `cfg` 文件夹中新建文件 `gamestate_integration_astra_scoreboard.cfg`，内容如下：
```
"CS2 Scoreboard"
{
 "uri" "http://127.0.0.1:32121/"
 "timeout" "5.0"
 "buffer" "0.1"
 "throttle" "0.5"
 "heartbeat" "30.0"
 "data"
 {
  "provider"      "1"
  "map"           "1"
  "round"         "1"
  "player_id"     "1"
  "player_state"  "1"
  "player_match_stats" "1"
  "allplayers_id"      "1"
  "allplayers_state"   "1"
  "allplayers_match_stats" "1"
  "allplayers_position"    "1"
 }
}
```

### 2. 添加到 OBS

1. 添加 **浏览器源（Browser Source）**。
2. URL：`http://127.0.0.1:8080`
3. 分辨率：`1920 x 1080`
4. 可选勾选 **不可见时关闭源**。

比赛开始后，叠加层自动显示。

---

## 操作说明

### 全局快捷键

在 **Hotkeys** 页面可自定义，支持一键全局启用/停用。

| 功能 | 默认按键 |
|------|---------|
| 左队 +1 | `A` |
| 右队 +1 | `B` |
| 左队 -1 | `C` |
| 右队 -1 | `D` |
| 交换比分 | `S` |
| 重置比赛 | `R` |

### Score.txt 导出

软件自动将 `score.txt` 写入指定文件夹，可用于 OBS **文本（GDI+）** 源作为轻量比分显示。

默认路径：`%APPDATA%/Astra Scoreboard/scores/score.txt`

在 **Scoreboard** 页面 → **Score.txt Output** → **Change** 修改路径。

---

## 自定义设置

- **队伍颜色** — 实时修改 CT/T 主色、发光色、边框色、阴影色。
- **队伍 Logo** — 上传 PNG/JPG/WebP 作为卡片背景水印。
- **透明度** — 独立调节黑色玻璃层和 Logo 透明度。
- **赛制** — BO1、BO3 或自定义。
- **缩放** — 窗口等比例缩放，内容始终清晰。

---

## 工作原理

- **GSI 服务器**（`:32121`）— 每 0.5 秒接收 CS2 原始游戏数据。
- **ADR 引擎** — 追踪每回合伤害峰值，锁定已结束回合，计算滚动平均值。误差范围：±10（实时 GSI 工具的行业标准）。
- **MVP 逻辑** — ADR 排名 + K/D 排名综合评分。平局决胜：击杀数 → ADR 原始值 → 死亡数。
- **OBS 服务器**（`:8080`）— 提供自包含 HTML 叠加层，通过轮询实时状态渲染。

---

## 技术栈

- **前端：** React 19、TypeScript、Tailwind CSS、Framer Motion、Zustand
- **桌面端：** Electron、electron-builder
- **运行时：** Node.js `http`（双服务器架构）
- **持久化：** electron-store

---

## 已知限制

- **CS2 必须保持前台** 才能发送 GSI 数据。切到后台超过 5 秒会显示 `DISCONNECTED`，切回后自动恢复。
- **ADR 精度** 因 GSI 0.5 秒采样间隔存在 ±10 误差，这是所有实时工具的固有特性。
- **队伍名称** 限制为 4 个汉字（或等效宽度），防止布局溢出。

---

## 许可证

MIT © [Hyun-05](https://github.com/Hyun-05)

---

<p align="center">
  <sub>为 CS2 赛事导播而造。</sub>
</p>
