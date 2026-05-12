🇨🇳 [简体中文](./README_CN.md)

# Astra Scoreboard

> Real-time CS2 broadcast overlay & data panel for tournament directors.

[![Electron](https://img.shields.io/badge/Electron-41.5.1-47848F?logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19.2.0-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)

---

## What is this?

Astra Scoreboard is a desktop application built for **CS2 tournament broadcasters** and **OBS streamers**. It connects directly to CS2's Game State Integration (GSI) to pull live match data — scores, player stats, ADR, K/D — and renders a clean, customizable overlay for your stream.

No manual score editing. No spreadsheet juggling. Just launch the app, add the browser source to OBS, and let the data flow.

---

## Download

| Version | File |
|---------|------|
| Installer | `Astra Scoreboard Setup X.X.X.exe` |
| Portable | `Astra Scoreboard_Portable.exe` |

> **Windows 10/11 only.** Requires no additional runtime.

---

## Quick Start

### 1. Connect CS2 (GSI)

**Auto Setup (Recommended)**
1. Open the app → go to **Scoreboard** tab.
2. Click **Auto Config GSI**.
3. Browse to your CS2 `cfg` folder:
   ```
   .../Counter-Strike Global Offensive/game/csgo/cfg
   ```
4. The app writes `gamestate_integration_astra_scoreboard.cfg` automatically.
5. **Restart CS2** if it was running.

**Manual Setup**
Create `gamestate_integration_astra_scoreboard.cfg` in the `cfg` folder with:
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

### 2. Add to OBS

1. Add a **Browser Source**.
2. URL: `http://127.0.0.1:8080`
3. Resolution: `1920 x 1080`
4. Check **Shutdown source when not visible** (optional).

The overlay appears automatically once a match is live.

---

## Controls

### Global Hotkeys

Configurable in the **Hotkeys** tab. Can be toggled on/off globally.

| Action | Default |
|--------|---------|
| Left Team +1 | `A` |
| Right Team +1 | `B` |
| Left Team -1 | `C` |
| Right Team -1 | `D` |
| Swap Scores | `S` |
| Reset Match | `R` |

### Score.txt Export

The app auto-writes `score.txt` to a folder of your choice. Use it with an OBS **Text (GDI+)** source for a lightweight score display.

Default path: `%APPDATA%/Astra Scoreboard/scores/score.txt`

Change it in the **Scoreboard** tab → **Score.txt Output** → **Change**.

---

## Customization

- **Colors** — Real-time CT/T color editing (primary, glow, border, shadow).
- **Logos** — Upload PNG/JPG/WebP as team card backgrounds.
- **Opacity** — Adjust black glass layer and logo transparency independently.
- **Match Format** — BO1, BO3, or custom.
- **Scaling** — Window resizes proportionally; content stays crisp.

---

## How It Works

- **GSI Server** (`:32121`) — Receives raw game data from CS2 every 0.5s.
- **ADR Engine** — Tracks per-round damage peaks, locks completed rounds, and computes rolling averages. Tolerance: ±10 (industry standard for real-time GSI tools).
- **MVP Logic** — ADR rank + K/D rank composite score. Tie-breakers: Kills → ADR raw → Deaths.
- **OBS Server** (`:8080`) — Serves a self-contained HTML overlay with live state polling.

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS, Framer Motion, Zustand
- **Desktop:** Electron, electron-builder
- **Runtime:** Node.js `http` (dual-server architecture)
- **Persistence:** electron-store

---

## Known Limitations

- **CS2 must stay in the foreground** for GSI to transmit. Alt-tabbing away for >5s shows `DISCONNECTED`; resumes automatically on focus.
- **ADR accuracy** is ±10 due to GSI's 0.5s throttle. This is normal and unavoidable for real-time tools.
- **Team names** are capped at 4 Chinese characters (or equivalent width) to prevent layout overflow.

---

## License

MIT © [Hyun-05](https://github.com/Hyun-05)

---

<p align="center">
  <sub>Made for CS2 tournament directors.</sub>
</p>
