# Astra Director

A professional CS2 broadcast production toolkit that bridges live game data with OBS Browser Sources. Built for tournament directors, stream producers, and esports broadcasters who need real-time scoreboards, player statistics, and map pick/ban visuals without manual data entry.

**[中文文档](README_CN.md)**

---

## ✨ Features

### Live Scoreboard & Player Stats
- **Real-time GSI integration** — Auto-receives CS2 Game State Integration data (scores, kills, deaths, assists, ADR, K/D)
- **Dual-panel player tables** — CT vs T side-by-side with live sorting by ADR
- **MVP auto-calculation** — Computes post-map MVP based on ADR rank + K/D rank composite scoring
- **Map series tracking** — BO1/BO3/BO5 format with per-map scores and current map indicator

### Ban & Pick Visuals
- **Three mask styles** — Mono (grayscale), Stylized (tri-tone gradient mapping), Glitch (scanlines + chromatic aberration)
- **Customizable tri-tone colors** — Shadow / Mid / Highlight tones for stylized bans
- **Side selection display** — Shows opponent's CT/T choice on picked maps with team names
- **Decider differentiation** — Final map gets golden "Decider" tag + "FINAL MAP" text
- **Staggered entrance animation** — Cards slide in one-by-one when Animation is toggled On

### OBS Integration
- **Zero-latency Browser Sources** — Dedicated HTTP server (`127.0.0.1:8080`) serving optimized HTML pages
- **Multiple endpoints**
  - `/` — Main scoreboard
  - `/bp` — Ban & Pick overlay
  - `/name1` / `/name2` — Team name overlays with auto-fit text stroke
- **Auto GSI config** — One-click generation of `gamestate_integration_astra_Director.cfg`
- **Score TXT export** — Writes `score.txt`, `simple.txt`, `teamname1.txt`, `teamname2.txt` for external tools

### Customization
- **Team colors** — Independent CT/T primary color, glow, border, shadow
- **Background images** — Upload custom team backgrounds with opacity control
- **UI responsiveness** — Width-driven scaling with minimum font sizes, no black bars on resize
- **Hotkey support** — Keyboard shortcuts for score +/-, swap, reset

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop App | Electron (main.cjs + preload.cjs) |
| Frontend | React + TypeScript + Tailwind CSS |
| State Management | Zustand (appStore.ts) |
| Animation | Framer Motion + CSS keyframes |
| Data Source | CS2 GSI (HTTP POST `127.0.0.1:32121`) |
| OBS Server | Node.js `http` module (port 8080) |
| Persistence | `electron-store` |
| Fonts | Rajdhani, Quantico, JetBrains Mono |

---

## 📦 Installation

Download the latest `Astra Director Setup X.X.X.exe` from [Releases](../../releases) and run it. No additional dependencies required.

**Built-in assets** (maps, fonts, default backgrounds) are bundled via `extraResources` — no manual file placement needed.

---

## 🚀 Quick Start

1. **Launch** Astra Director
2. **Auto-config GSI** — Click the button to generate the cfg file in your CS2 `game/csgo/cfg` folder
3. **Start CS2** with `-gamestateintegration` or ensure the cfg is loaded
4. **Add OBS Browser Sources**
   - Scoreboard: `http://127.0.0.1:8080/` (1920×1080)
   - Ban/Pick: `http://127.0.0.1:8080/bp` (1920×1080)
   - Team Names: `http://127.0.0.1:8080/name1` and `/name2`

---

## 🎮 Development

```bash
# Install dependencies
npm install

# Run in development mode (Vite + Electron)
npm run electron:dev

# Build production executable
npm run build
npm run electron:build
```

---

## 📄 License

MIT License — feel free to fork and modify for your own broadcasts.

---

*Crafted with precision for the CS2 esports community.*
