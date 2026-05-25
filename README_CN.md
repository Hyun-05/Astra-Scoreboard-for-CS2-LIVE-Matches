# Astra Director

一款专业的 CS2 赛事导播工具，打通游戏实时数据与 OBS 浏览器源。为赛事导演、直播制作人和电竞导播团队设计，无需手动录入即可实现实时比分板、选手数据面板和 BP 选图视觉呈现。

**[English README](README.md)**

---

## ✨ 功能特性

### 实时比分与选手数据
- **GSI 实时接入** — 自动接收 CS2 游戏状态集成数据（比分、击杀、死亡、助攻、ADR、K/D）
- **双栏选手表** — CT 与 T 阵营并排显示，按 ADR 实时排序
- **MVP 自动计算** — 基于 ADR 排名 + K/D 排名综合评分，自动判定单图 MVP
- **系列赛追踪** — 支持 BO1/BO3/BO5 赛制，记录每小局比分与当前局次

### Ban & Pick 视觉系统
- **三种遮罩风格** — Mono（高对比灰度）、Stylized（三色渐变映射）、Glitch（扫描线+色差故障风）
- **可自定义三色调** — 暗部 / 中间调 / 亮部三色自由调配
- **选边显示** — Pick 地图下方显示对方队伍选边（CT/T），带队伍名与阵营图标
- **决胜图差异化** — 最后一张图自动标注金色 Decider 标签与 "FINAL MAP" 字样
- **阶梯入场动画** — 开启 Animation 后卡片依次从下方滑入

### OBS 深度集成
- **零延迟浏览器源** — 独立 HTTP 服务器（`127.0.0.1:8080`）输出优化 HTML 页面
- **多路由端点**
  - `/` — 主比分板
  - `/bp` — BP 选图界面
  - `/name1` / `/name2` — 队伍名 overlay（自动适配 + 描边）
- **GSI 自动配置** — 一键生成 `gamestate_integration_astra_Director.cfg`
- **比分 TXT 导出** — 自动写入 `score.txt`、`simple.txt`、`teamname1.txt`、`teamname2.txt` 供外部工具调用

### 深度自定义
- **队伍配色** — CT/T 独立配置主色、发光色、边框色、阴影色
- **背景图上传** — 支持自定义队伍背景图，透明度可调
- **响应式布局** — 以宽度为基准等比缩放，最小字号保护，缩放无黑边
- **快捷键支持** — 键盘快捷键控制加分、减分、交换、重置

---

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| 桌面端 | Electron（main.cjs + preload.cjs） |
| 前端 | React + TypeScript + Tailwind CSS |
| 状态管理 | Zustand（appStore.ts） |
| 动画 | Framer Motion + CSS keyframes |
| 数据源 | CS2 GSI（HTTP POST `127.0.0.1:32121`） |
| OBS 服务 | Node.js `http` 模块（端口 8080） |
| 持久化 | `electron-store` |
| 字体 | Rajdhani、Quantico、JetBrains Mono |

---

## 📦 安装

从 [Releases](../../releases) 下载最新版 `Astra Director Setup X.X.X.exe`，双击运行即可。无需额外依赖。

**内置素材**（地图图、字体、默认背景）通过 `extraResources` 打包进安装包，用户无需手动放置文件。

---

## 🚀 快速开始

1. **启动** Astra Director
2. **自动配置 GSI** — 点击按钮将 cfg 文件生成到 CS2 `game/csgo/cfg` 目录
3. **启动 CS2** 并确保 GSI 配置已加载
4. **在 OBS 中添加浏览器源**
   - 比分板：`http://127.0.0.1:8080/`（1920×1080）
   - BP 选图：`http://127.0.0.1:8080/bp`（1920×1080）
   - 队伍名：`http://127.0.0.1:8080/name1` 与 `/name2`

---

## 🎮 开发

```bash
# 安装依赖
npm install

# 开发模式（Vite + Electron）
npm run electron:dev

# 构建生产版可执行文件
npm run build
npm run electron:build
```

---

## 📄 许可

MIT License — 可自由 fork 修改用于自有赛事直播。

---

*为 CS2 电竞社区精心打造。*
