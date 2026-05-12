# 开发指南

> 面向贡献者和编译者。普通用户请查看 [README.md](./README.md)。

---

## 环境要求

- Node.js 20+
- npm 10+
- Windows 10/11（用于原生模块编译）

---

## 项目设置

```bash
git clone https://github.com/Hyun-05/CS2-Scoreboard.git
cd CS2-Scoreboard
npm install
```

---

## 开发调试

```bash
# 启动 Vite 开发服务器
npm run dev

# 启动 Electron（开发模式下加载 Vite :3000）
npm run electron:dev
```

---

## 构建与打包

```bash
# 完整生产构建（Vite → dist/ + Electron 打包）
npm run dist
```

输出在 `release/` 目录：
- `Astra Scoreboard Setup X.X.X.exe` — NSIS 安装包
- `Astra Scoreboard_Portable.exe` — 绿色免安装版

---

## 项目结构

```
electron/
  main.cjs          # 主进程：GSI 服务器 (:32121)、OBS 服务器 (:8080)、IPC 处理
  preload.cjs       # 上下文桥接：向渲染进程暴露安全 API
src/
  components/       # 可复用 UI（侧边栏、战绩表、透明度滑块、背景设置...）
  sections/         # 路由级页面（控制面板、数据面板、快捷键、日志）
  store/            # Zustand 状态管理 (appStore.ts)
  App.tsx           # 根组件（含响应式缩放包装器）
  index.css         # 全局样式 + Tailwind 指令
public/             # 静态资源（Logo、背景图）— 由 Vite 自动复制到 dist/
```

---

## 架构说明

### 双服务器后端 (main.cjs)

| 服务器 | 端口 | 用途 |
|--------|------|------|
| GSI 服务器 | `:32121` | 接收 CS2 游戏状态集成的 POST 数据 |
| OBS 服务器 | `:8080` | 提供 HTML 叠加层、静态资源、`/api/state` JSON |

### 数据流向

```
CS2 ──GSI──→ main.cjs (:32121)
                │
                ├──→ obsState（内存状态）
                ├──→ electron-store（持久化存储）
                ├──→ score.txt（文件导出）
                └──→ mainWindow.webContents.send('gsi-data' | 'gsi-status')
                           │
                           ↓
                     渲染进程 (React + Zustand)
                           │
                           ├──→ Dashboard / DataPanel 界面
                           └──→ fetch('http://127.0.0.1:8080/api/state') ← OBS 浏览器源
```

---

## 关键 IPC 通道

| 通道 | 方向 | 载荷 | 用途 |
|-----------|-----------|---------|---------|
| `update-obs-state` | 渲染 → 主进程 | `newState` 对象 | 将比赛状态同步到后端 |
| `gsi-data` | 主进程 → 渲染 | CS2 GSI JSON | 实时玩家数据 (allplayers) |
| `gsi-status` | 主进程 → 渲染 | `boolean` | 连接心跳 |
| `map-ended` | 主进程 → 渲染 | `true` | 触发自动加分 + MVP 保存 |
| `auto-config-gsi` | 渲染 → 主进程 | — | 向 CS2 cfg 写入 GSI 配置文件 |
| `select-score-dir` | 渲染 → 主进程 | — | 修改 `score.txt` 输出目录 |
| `get-score-dir` | 渲染 → 主进程 | — | 读取当前 `score.txt` 目录 |
| `select-bg-image` | 渲染 → 主进程 | `team: 'ct' \| 't'` | 复制 Logo 到持久化 public 目录 |
| `toggle-bg-visible` | 渲染 → 主进程 | `team, visible` | 显示/隐藏队伍卡片背景 |
| `update-team-color` | 渲染 → 主进程 | `team, colorData` | 更新 CT/T CSS 变量 |
| `get-bg-config` | 渲染 → 主进程 | — | 读取背景 + 透明度设置 |
| `get-team-colors` | 渲染 → 主进程 | — | 读取当前配色方案 |
| `minimize/maximize/close` | 渲染 → 主进程 | — | 无边框窗口控制 |

---

## 状态持久化

| 数据 | 存储方式 | 键名 |
|------|----------|------|
| 队伍颜色 | `electron-store` | `colors` |
| 背景透明度 | `electron-store` | `bgOpacity`, `bgImgOpacity` |
| Logo 文件名 | `electron-store` | `ctBgName`, `tBgName` |
| Logo 显示状态 | `electron-store` | `ctBgVisible`, `tBgVisible` |
| Score.txt 路径 | `electron-store` | `scoreTxtDir` |
| MVP 数据 | `electron-store` | `mvp`, `showMvp` |
| 快捷键开关 | `localStorage`（渲染进程） | `hotkeysEnabled` |

---

## ADR 计算逻辑

1. **峰值追踪**：每次 GSI 数据包更新 `roundPeakDmgs[round][steamid]`，取该回合见过的最大 `round_totaldmg`。
2. **回合锁定**：当 `map.round` 递增时，将上一回合的峰值累加到 `playerTotalDamage`，并标记到 `recordedRounds`。
3. **滞后保护**：锁定后删除 `roundPeakDmgs[currentRound]`，防止 Freeze Time 期间的陈旧数据污染新回合。
4. **显示计算**：`ADR = playerTotalDamage[steamid] / recordedRounds.size`。若 `size === 0`，回退到当前 `round_totaldmg`。

误差范围：±10（由 GSI 0.5 秒采样间隔导致，所有实时工具的共同限制）。

---

## MVP 评选算法

```
1. 全部 10 名玩家按 ADR 排序 → 得到 ADR 排名
2. 全部 10 名玩家按 K/D 排序 → 得到 K/D 排名
3. 综合评分 = ADR 排名 + K/D 排名（越小越好）
4. 平局决胜：击杀数 → ADR 原始值 → 死亡数
```

仅在 `map.phase === 'gameover'` 时触发。结果保存到 `electron-store`，用于赛后展示。

---

## 重要注意事项

- **`PUBLIC_DIR` 必须使用 `app.getPath('userData')`** — `../dist` 和 `../public` 在打包后的 ASAR 中为只读。用户上传的 Logo 会被复制到 `%APPDATA%/Astra Scoreboard/astra-public/`。
- **切勿提交 `node_modules`、`dist/`、`release/`** — 它们由 `npm run dist` 自动生成。
- **GSI 需要 CS2 保持前台** — 这是 Valve 引擎限制，非软件缺陷。
- **队伍名称限制**：4 个汉字（或等效宽度），防止 OBS 叠加层文本溢出。

---

## 许可证

MIT © [Hyun-05](https://github.com/Hyun-05)
