# Development Guide

> For contributors and builders. End users should see [README.md](./README.md).

---

## Requirements

- Node.js 20+
- npm 10+
- Windows 10/11 (for native module compilation)

---

## Setup

```bash
git clone https://github.com/Hyun-05/CS2-Scoreboard.git
cd CS2-Scoreboard
npm install
```

---

## Development

```bash
# Start Vite dev server
npm run dev

# Launch Electron (loads Vite :3000 in dev mode)
npm run electron:dev
```

---

## Build & Package

```bash
# Full production build (Vite → dist/ + Electron packaging)
npm run dist
```

Output in `release/`:
- `Astra Scoreboard Setup X.X.X.exe` — NSIS installer
- `Astra Scoreboard_Portable.exe` — Portable executable

---

## Project Structure

```
electron/
  main.cjs          # Main process: GSI server (:32121), OBS server (:8080), IPC handlers
  preload.cjs       # Context bridge: exposes safe API to renderer
src/
  components/       # Reusable UI (Sidebar, PlayerTable, OpacitySlider, BgSettings...)
  sections/         # Route-level pages (Dashboard, DataPanel, HotkeysPage, LogsPage)
  store/            # Zustand state management (appStore.ts)
  App.tsx           # Root component with responsive scale wrapper
  index.css         # Global styles + Tailwind directives
public/             # Static assets (logos, backgrounds) — copied to dist/ by Vite
```

---

## Architecture

### Dual-Server Backend (main.cjs)

| Server | Port | Purpose |
|--------|------|---------|
| GSI Server | `:32121` | Receives CS2 Game State Integration POST payloads |
| OBS Server | `:8080` | Serves HTML overlay + static assets + `/api/state` JSON |

### Data Flow

```
CS2 ──GSI──→ main.cjs (:32121)
                │
                ├──→ obsState (in-memory)
                ├──→ electron-store (persistence)
                ├──→ score.txt (file export)
                └──→ mainWindow.webContents.send('gsi-data' | 'gsi-status')
                           │
                           ↓
                     Renderer (React + Zustand)
                           │
                           ├──→ Dashboard / DataPanel UI
                           └──→ fetch('http://127.0.0.1:8080/api/state') ← OBS Browser Source
```

---

## Key IPC Channels

| Channel | Direction | Payload | Purpose |
|-----------|-----------|---------|---------|
| `update-obs-state` | Renderer → Main | `newState` object | Sync match state to backend |
| `gsi-data` | Main → Renderer | CS2 GSI JSON | Live player stats (allplayers) |
| `gsi-status` | Main → Renderer | `boolean` | Connection heartbeat |
| `map-ended` | Main → Renderer | `true` | Trigger auto score + MVP save |
| `auto-config-gsi` | Renderer → Main | — | Write `gamestate_integration_*.cfg` to CS2 cfg |
| `select-score-dir` | Renderer → Main | — | Change `score.txt` output directory |
| `get-score-dir` | Renderer → Main | — | Read current `score.txt` directory |
| `select-bg-image` | Renderer → Main | `team: 'ct' \| 't'` | Copy logo to persistent public dir |
| `toggle-bg-visible` | Renderer → Main | `team, visible` | Show/hide team card background |
| `update-team-color` | Renderer → Main | `team, colorData` | Update CT/T CSS variables |
| `get-bg-config` | Renderer → Main | — | Read background + opacity settings |
| `get-team-colors` | Renderer → Main | — | Read current color palette |
| `minimize/maximize/close` | Renderer → Main | — | Frameless window controls |

---

## State Persistence

| Data | Store | Key |
|------|-------|-----|
| Team colors | `electron-store` | `colors` |
| BG opacity | `electron-store` | `bgOpacity`, `bgImgOpacity` |
| Logo files | `electron-store` | `ctBgName`, `tBgName` |
| Logo visibility | `electron-store` | `ctBgVisible`, `tBgVisible` |
| Score.txt path | `electron-store` | `scoreTxtDir` |
| MVP data | `electron-store` | `mvp`, `showMvp` |
| Hotkeys enabled | `localStorage` (renderer) | `hotkeysEnabled` |

---

## ADR Calculation Logic

1. **Peak Tracking**: Every GSI payload updates `roundPeakDmgs[round][steamid]` with the maximum `round_totaldmg` seen so far.
2. **Round Lock**: When `map.round` increments, the previous round's peaks are summed into `playerTotalDamage` and marked in `recordedRounds`.
3. **Lag Guard**: After locking, `roundPeakDmgs[currentRound]` is deleted to prevent stale freeze-time data from polluting the new round.
4. **Display**: `ADR = playerTotalDamage[steamid] / recordedRounds.size`. If `size === 0`, falls back to current `round_totaldmg`.

Tolerance: ±10 (inherent to GSI's 0.5s throttle).

---

## MVP Selection Algorithm

```
1. Sort all 10 players by ADR → get ADR rank
2. Sort all 10 players by K/D → get K/D rank
3. Composite score = ADR rank + K/D rank (lower is better)
4. Tie-breakers: Kills → raw ADR → Deaths
```

Only applied when `map.phase === 'gameover'`. Saved to `electron-store` for post-match display.

---

## Important Notes

- **`PUBLIC_DIR` must use `app.getPath('userData')`** — `../dist` and `../public` are read-only in packaged ASAR builds. User-uploaded logos are copied to `%APPDATA%/Astra Scoreboard/astra-public/`.
- **Never commit `node_modules`, `dist/`, `release/`** — They are regenerated by `npm run dist`.
- **GSI requires CS2 foreground** — This is a Valve engine limitation, not a bug.
- **Team name limit**: 4 Chinese characters (or equivalent width) to prevent OBS overlay overflow.

---

## License

MIT © [Hyun-05](https://github.com/Hyun-05)
