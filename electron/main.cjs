const { app, BrowserWindow, ipcMain } = require('electron');

const path = require('path');
const http = require('http');
const fs = require('fs');
let lastTxtWrite = 0;
const TXT_WRITE_INTERVAL = 1000;
let mainWindow;
let lastGsiTime = 0;
let gsiServer = null;
let lastObsUpdate = 0;
let lastIpcSend = 0;  
let roundHasAllplayers = new Set();
let displayAdr = {};
const OBS_UPDATE_INTERVAL = 500;
const Store = require('electron-store').default;
const store = new Store();
const PUBLIC_DIR = path.join(app.getPath('userData'), 'astra-public');


let obsState = {
  format: 'BO3',
  showMvp: true,
  bgOpacity: 1,
  teamLeft: { name: 'CT TEAM', score: 0, mapScore: 0, players: [] },
  teamRight: { name: 'T TEAM', score: 0, mapScore: 0, players: [] },
  bgImgOpacity: 0.3,
  currentMap: 1,
  matchOver: false,
  bpAnimEnabled: false,
  bpCardsVisible: true,
  bpStyle: 'mono',
  bpColors: { dark: '#292727', mid: '#6b4226', light: '#b26500' },
  bpCustomColors: {
    titleStart: '#fff700',
    titleEnd: '#eb8100',
    teamBarStart: '#0c2d63',
    teamBarEnd: '#0a2249',
    deciderTag: '#ffc107',
    deciderText: '#191919',
    banTag: '#dc2626',
    banText: '#ffffff',
    pickTag: '#22c55e',
    pickText: '#ffffff',
  },
  winner: null,
  gsiConnected: false,
  mapName: '',
  round: 0,
  bp: { pool: [], sequence: [], teamLeft: '', teamRight: '' },
  ctBgVisible: false,
  tBgVisible: false,
  ctBgName: 'ct_bg.png',
  tBgName: 't_bg.png',
    colors: {
    ct: {
      primary: '#00F0FF',
      glow: 'rgba(0,240,255,1)',
      bg: 'rgba(0,240,255,0.15)',
      border: 'rgba(0,240,255,0.3)',
      shadow: 'rgba(0, 240, 255, 0.35)',
      alpha: 'rgb(0, 238, 255)'
    },
    t: {
      primary: '#FF9100',
      glow: 'rgba(255,145,0,1)',
      bg: 'rgba(255,61,0,0.15)',
      border: 'rgba(255,61,0,0.3)',
      shadow: 'rgba(255, 61, 0, 0.35)',
      alpha: 'rgb(255, 145, 0)'
    }
  }
};

let playerTotalDamage = {};
let lastRound = 0;
let recordedRounds = new Set();
let lastMapPhase = '';
let roundPeakDmgs = {};

function resetAdrTracker() {
  playerTotalDamage = {};
  lastRound = 0;
  recordedRounds.clear();
  roundPeakDmgs = {};
  displayAdr = {};
  console.log('>>> ADR tracker reset');
}

function recalcDisplayAdr() {
  const completedRounds = recordedRounds.size;
  if (completedRounds === 0) return;
  Object.keys(playerTotalDamage).forEach(sid => {
    const total = playerTotalDamage[sid] || 0;
    displayAdr[sid] = Math.round(total / completedRounds);
  });
}

function writeScoreTxt() {
  if (!store.get('scoreTxtEnabled', false)) return;
  const now = Date.now();
  if (now - lastTxtWrite < TXT_WRITE_INTERVAL) return;
  lastTxtWrite = now;

  const defaultDir = path.join(app.getPath('userData'), 'scores');
  const txtDir = store.get('scoreTxtDir', defaultDir);
  
  if (!fs.existsSync(txtDir)) fs.mkdirSync(txtDir, { recursive: true });
  
  const txtPath = path.join(txtDir, 'score.txt');
  const content = `${obsState.teamLeft.score} : ${obsState.teamRight.score}`;
  fs.writeFileSync(txtPath, content, 'utf8');
  
  const simplePath = path.join(txtDir, 'simple.txt');
  fs.writeFileSync(simplePath, `${obsState.teamLeft.score}:${obsState.teamRight.score}`, 'utf8');
}
function writeTeamNameTxt() {
  const defaultDir = path.join(app.getPath('userData'), 'scores');
  const txtDir = store.get('scoreTxtDir', defaultDir);
  
  if (!fs.existsSync(txtDir)) fs.mkdirSync(txtDir, { recursive: true });
  
  fs.writeFileSync(path.join(txtDir, 'teamname1.txt'), obsState.teamLeft.name, 'utf8');
  fs.writeFileSync(path.join(txtDir, 'teamname2.txt'), obsState.teamRight.name, 'utf8');
}

function startGsiServer() {
  gsiServer = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          lastGsiTime = Date.now();
          obsState.gsiConnected = true; 

          if (data.map) {
            console.log('>>> GSI map data:', JSON.stringify(data.map, null, 2));
            obsState.mapName = data.map.name || obsState.mapName;
            obsState.round = data.map.round || 0;

            const currentRound = data.map.round || 0;
            const mapPhase = data.map.phase || '';

            // ========== 1. 新地图检测（gameover → live/warmup）==========
            if (lastMapPhase === 'gameover' && (mapPhase === 'live' || mapPhase === 'warmup')) {
              console.log('>>> New map detected via GSI');

              // 新地图单局比分归零（GSI 会立即推送新值覆盖）
              obsState.teamLeft.mapScore = 0;
              obsState.teamRight.mapScore = 0;
              // 当前地图编号 +1
              obsState.currentMap += 1;
              // 通知前端更新 currentMap
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('map-changed', obsState.currentMap);
              }
              console.log('>>> Current map:', obsState.currentMap);
              // 清掉上一场 MVP
              obsState.showMvp = false;
              obsState.mvp = null;
              store.set('showMvp', false);
              store.delete('mvp');

              // 重置 ADR 追踪器
              resetAdrTracker();
            }

            // ========== 2. 回合切换检测（锁定 ADR）==========
            if (currentRound > lastRound ) {
              for (let r = lastRound; r < currentRound; r++) {
                if (recordedRounds.has(r)) {
                  console.log('>>> Round', r, 'already locked, skip');
                  continue;
                }
                if (!roundHasAllplayers.has(r)) {
                  console.log('>>> Round', r, 'no GSI data, skip');
                  continue;
                }
                
                const peaks = roundPeakDmgs[r] || {};
                Object.entries(peaks).forEach(([sid, dmg]) => {
                  playerTotalDamage[sid] = (playerTotalDamage[sid] || 0) + dmg;
                });
                recordedRounds.add(r);
                delete roundPeakDmgs[r];
                console.log('>>> Round', r, 'locked, total:', recordedRounds.size);
              }
              recalcDisplayAdr();
            }
              delete roundPeakDmgs[currentRound];
              roundHasAllplayers.delete(currentRound);
            // ========== 3. 地图结束（gameover）==========
            if (mapPhase === 'gameover' && lastMapPhase !== 'gameover') {
              console.log('>>> GAMEOVER detected, round:', currentRound);
              
              // 锁定所有未记录的回合
              for (let r = 1; r <= currentRound; r++) {
                if (recordedRounds.has(r)) continue;
                if (!roundHasAllplayers.has(r)) continue;
                
                const peaks = roundPeakDmgs[r] || {};
                Object.entries(peaks).forEach(([sid, dmg]) => {
                  playerTotalDamage[sid] = (playerTotalDamage[sid] || 0) + dmg;
                });
                recordedRounds.add(r);
                delete roundPeakDmgs[r];
              }
              recalcDisplayAdr();
              console.log('>>> Final ADR recalculated');

              // ========== 计算并保存 MVP ==========
              // ========== 计算并保存 MVP ==========
              const allPlayers = [
                ...obsState.teamLeft.players,
                ...obsState.teamRight.players
              ];

              // 1. 分别计算 ADR 排名和 KD 排名（同分并列排名）
              const sortedByAdr = [...allPlayers].sort((a, b) => (b.adr || 0) - (a.adr || 0));
              const sortedByKd = [...allPlayers].sort((a, b) => (b.kd || 0) - (a.kd || 0));

              const getAdrRank = (p) => sortedByAdr.findIndex(x => x.steamid === p.steamid) + 1;
              const getKdRank = (p) => sortedByKd.findIndex(x => x.steamid === p.steamid) + 1;

              // 2. 综合评分 = ADR排名 + KD排名（越小越好）
              const scoredPlayers = allPlayers.map(p => ({
                ...p,
                adrRank: getAdrRank(p),
                kdRank: getKdRank(p),
                totalRank: getAdrRank(p) + getKdRank(p)
              }));

              // 3. 按综合评分排序，引入决胜指标
              const mvpPlayer = scoredPlayers.sort((a, b) => {
                // 第1层：综合排名和
                if (a.totalRank !== b.totalRank) return a.totalRank - b.totalRank;
                
                // 第2层：击杀数 K（高者胜）
                if ((a.kills || 0) !== (b.kills || 0)) return (b.kills || 0) - (a.kills || 0);
                
                // 第3层：ADR原始值（高者胜）
                if ((a.adr || 0) !== (b.adr || 0)) return (b.adr || 0) - (a.adr || 0);
                
                // 第4层：死亡数 D（低者胜）
                return (a.deaths || 0) - (b.deaths || 0);
              })[0];
              
              if (mvpPlayer) {
                obsState.mvp = {
                  name: mvpPlayer.name,
                  team: mvpPlayer.team,
                  kd: mvpPlayer.kd,
                  adr: mvpPlayer.adr
                };
                obsState.showMvp = true;
                
                // 持久化，软件重启后仍能显示
                store.set('mvp', obsState.mvp);
                store.set('showMvp', true);
                
                console.log('>>> MVP saved:', mvpPlayer.name, 'K/D', mvpPlayer.kd);
              }

              // 通知前端显示 MVP
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('map-ended', true);
              }

              // 注意：这里不要 resetAdrTracker()，因为 gameover 后可能还要显示 ADR
              // reset 留到新地图检测或前端 Reset 按钮时做
            }

            // 保存当前状态，供下一次比对
            lastMapPhase = mapPhase;
            lastRound = currentRound;
          }
          if (data.allplayers) {
            const currentRound = data.map?.round || 0;
            roundHasAllplayers.add(currentRound); // ← 移到 currentRound 定义之后
            
            const now = Date.now();
            Object.entries(data.allplayers).forEach(([steamid, p]) => {
              if (p.state) {
                const currentDmg = p.state.round_totaldmg || 0;
                if (!roundPeakDmgs[currentRound]) roundPeakDmgs[currentRound] = {};
                const prevPeak = roundPeakDmgs[currentRound][steamid] || 0;
                if (currentDmg > prevPeak) {
                  roundPeakDmgs[currentRound][steamid] = currentDmg;
                }
                const completedRounds = recordedRounds.size;
                if (completedRounds === 0) {
                  p.state.adr = currentDmg;
                } else {
                  p.state.adr = displayAdr[steamid] || 0;
                }
              }
            });

            if (now - lastObsUpdate > OBS_UPDATE_INTERVAL) {
              lastObsUpdate = now;
              const players = Object.entries(data.allplayers).map(([steamid, p]) => ({
                steamid,
                name: p.name || 'Unknown',
                team: p.team || 'CT',
                kills: p.match_stats?.kills || 0,
                deaths: p.match_stats?.deaths || 0,
                assists: p.match_stats?.assists || 0,
                adr: p.state?.adr || 0,
              }));
              obsState.teamLeft.players = players.filter(p => p.team === 'CT');
              obsState.teamRight.players = players.filter(p => p.team === 'T');
            }

            const rounds = Object.keys(roundPeakDmgs).map(Number).sort((a, b) => a - b);
            if (rounds.length > 30) {
              rounds.slice(0, rounds.length - 5).forEach(r => delete roundPeakDmgs[r]);
            }
          }

          const now = Date.now();
          if (mainWindow && !mainWindow.isDestroyed() && now - lastIpcSend > 1000) {
            lastIpcSend = now;
            mainWindow.webContents.send('gsi-data', data);
          }
        } catch (e) {
          console.error('GSI parse error:', e);
        }
        res.writeHead(200);
        res.end('OK');
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  gsiServer.on('error', (err) => {
    console.error('GSI server error:', err);
  });

  gsiServer.listen(32121, '127.0.0.1', () => {
    console.log('GSI server listening on http://127.0.0.1:32121');
  });

  let lastGsiStatus = false;
  setInterval(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const connected = Date.now() - lastGsiTime < 5000;
    if (connected !== lastGsiStatus) {
      lastGsiStatus = connected;
      obsState.gsiConnected = connected;
      mainWindow.webContents.send('gsi-status', connected);
      console.log('>>> GSI heartbeat:', connected ? 'CONNECTED' : 'DISCONNECTED');
    }
  }, 5000);
}

function startObsServer() {
  const obsServer = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    // ========== 新增：支持 /maps/bp/xxx.png 和 /maps/logo/xxx.png ==========
    const mapPathMatch = req.url.match(/^\/maps\/(.+\.(png|jpg|jpeg|webp|gif))$/i);
    if (mapPathMatch) {
      const relativePath = mapPathMatch[1]; // e.g., "bp/Ancient.png" or "logo/Ancient.png"

      const possiblePaths = [
        path.join(PUBLIC_DIR, 'maps', relativePath),                    // userData/astra-public/maps/bp/xxx.png
        path.join(__dirname, '../public/maps', relativePath),           // 开发时
        path.join(__dirname, '../dist/maps', relativePath),             // 构建后
        path.join(process.resourcesPath, 'public/maps', relativePath),  // 打包后 resources
      ];

      for (const imgPath of possiblePaths) {
        if (fs.existsSync(imgPath)) {
          const ext = path.extname(imgPath).toLowerCase();
          const mime = ext === '.png' ? 'image/png'
                     : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
                     : ext === '.gif' ? 'image/gif'
                     : 'image/webp';
          res.writeHead(200, { 'Content-Type': mime });
          res.end(fs.readFileSync(imgPath));
          return;
        }
      }
      res.writeHead(404); res.end();
      return;
    }

    // ========== 保留你现有的根路径图片路由（用于背景图）==========
    if (req.url.match(/^\/[^\/]+\.(png|jpg|jpeg|webp|gif)$/i)) {
      const fileName = path.basename(req.url);
      const bgPath = path.join(PUBLIC_DIR, fileName);

      if (fs.existsSync(bgPath)) {
        const ext = path.extname(bgPath).toLowerCase();
        const mime = ext === '.png' ? 'image/png'
                   : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
                   : ext === '.gif' ? 'image/gif'
                   : 'image/webp';
        res.writeHead(200, { 'Content-Type': mime });
        res.end(fs.readFileSync(bgPath));
      } else {
        res.writeHead(404); res.end();
      }
      return;
    }

    // ========== 保留你现有的其他路由 ==========
    else if (req.url === '/api/state') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(obsState));
    } else if (req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(generateObsHtml());
    } else if (req.url === '/bp') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(generateBpHtml());
    } else if (req.url === '/name1' || req.url === '/name2') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(generateNameHtml());
    } else if (req.url.match(/^\/fonts\/.+\.(woff2|woff|ttf|otf)$/i)) {
      const relativePath = req.url.replace(/^\/fonts\//, '');
      const possiblePaths = [
        path.join(__dirname, '../public/fonts', relativePath),
        path.join(__dirname, '../dist/fonts', relativePath),
        path.join(process.resourcesPath, 'public/fonts', relativePath),
      ];
      for (const fontPath of possiblePaths) {
        if (fs.existsSync(fontPath)) {
          const ext = path.extname(fontPath).toLowerCase();
          const mime = ext === '.woff2' ? 'font/woff2'
                    : ext === '.woff' ? 'font/woff'
                    : ext === '.ttf' ? 'font/ttf'
                    : 'font/opentype';
          res.writeHead(200, { 'Content-Type': mime });
          res.end(fs.readFileSync(fontPath));
          return;
        }
      }
    res.writeHead(404); res.end();
  }else {
      res.writeHead(404);
      res.end();
    }
  });

  obsServer.on('error', (err) => {
    console.error('OBS server error:', err);
  });

  obsServer.listen(8080, '127.0.0.1', () => {
    console.log('OBS Browser Source: http://127.0.0.1:8080');
  });
}

// ==================== OBS 网页 ====================
function generateObsHtml() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>CS2 Director - OBS</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=JetBrains+Mono:wght@400;700&display=swap');
  
  :root {
  --ct-rgb: 0, 240, 255;
  --t-rgb: 255, 145, 0;
  --bg-rgb: 20, 20, 24;
  
    --ct-primary: #00F0FF;
    --ct-glow: rgba(0,240,255,1);
    --ct-bg: rgba(0,240,255,0.15);
    --ct-border: rgb(0, 238, 255);
    --ct-shadow: rgba(0, 240, 255, 0.35);
    --ct-alpha: rgba(0, 240, 255, 0.25);
    
    --t-primary: #FF9100;
    --t-glow: rgba(255,145,0,1);
    --t-bg: rgba(255,61,0,0.15);
    --t-border: rgba(255,61,0,0.3);
    --t-shadow: rgba(255, 61, 0, 0.35);
    --t-alpha: rgba(255, 145, 0, 0.25);
  }
  
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Rajdhani', 'Microsoft YaHei', sans-serif;
    color: #fff;
    width: 1920px; height: 1080px;
    display: flex; flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding-top: 50px;
    overflow: hidden;
    background: transparent;
  }
  

  .top-panel {
    width: 880px;
    transform: scale(2);
    transform-origin: top center;
    margin-bottom: 160px;
    position: relative;
    z-index: 10;
  }

.scoreboard-wrapper {
  position: relative;
  border-radius: 14px;
  overflow: hidden;
}

.scoreboard-bg {
  position: absolute;
  inset: 0;
  background: rgba(20, 20, 24, 0.92);
  z-index: 0;
  border-radius: 14px;
  }
  .scoreboard-card {
    position: relative;
    z-index: 1;
    background: linear-gradient(90deg, 
      rgb(var(--ct-rgb)) 0%, 
      rgba(var(--ct-rgb), 0.8) 1%, 
      rgba(20, 20, 24, 0) 10%, 
      rgba(20, 20, 24, 0) 35%, 
      rgba(20, 20, 24, 0) 65%, 
      rgba(20, 20, 24, 0) 90%, 
      rgba(var(--t-rgb), 0.8) 99%, 
      rgb(var(--t-rgb)) 100%
    );
    border-radius: 7px;
    border: 0px solid rgba(255,255,255,0.08);
    padding: 18px 40px;
    text-align: center;
  }
  .teams-row {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 20px;
    margin-bottom: 6px;
  }
  .team-lg {
    font-size: 28px; font-weight: 700;
    letter-spacing: 0.08em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
  .team-lg.ct { 
    color: var(--ct-primary); 
    text-shadow: 0 0 3px var(--ct-glow);
    text-align: right;
  }
  .team-lg.t { 
    color: var(--t-primary); 
    text-shadow: 0 0 3px var(--t-glow);
    text-align: left;
  }
  .big-score {
    font-size: 64px; font-weight: 800;
    font-variant-numeric: tabular-nums;
    line-height: 1; color: #fff;
    letter-spacing: -0.02em;
    text-align: center;
  }
  .meta {
    font-size: 13px; color: #64748B;
    margin-top: 8px; letter-spacing: 0.1em;
    text-align: center;
  }
  .map-score-row {
    display: flex; align-items: center; justify-content: center; gap: 12px;
    margin-top: 6px; font-size: 16px; font-weight: 700;
  }
  .map-score-ct { color: var(--ct-primary); font-variant-numeric: tabular-nums; text-shadow: 0 0 3px var(--ct-glow); }
  .map-score-t { color: var(--t-primary); font-variant-numeric: tabular-nums; text-shadow: 0 0 3px var(--t-glow); }
  .map-sep { color: #475569; font-size: 13px; font-weight: 400; }
  
  .boards {
    width: 880px;
    transform: scale(2);
    transform-origin: top center;
    position: relative;
    z-index: 5;
    display: block;
  }
  .board-content {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    width: 100%;
    height: 100%;
  }

  .card {
    position: relative;
    background: rgba(20, 20, 24, 0.75);
    border-radius: 7px;
    overflow: hidden;
    backdrop-filter: blur(20px);
    border: 0px solid rgba(255,255,255,0.08);
    display: flex; flex-direction: column;
  }
  .card-bg-img-ct {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 85%; height: 85%;
    object-fit: contain;
    opacity: var(--bg-img-opacity, 0.3);   /* ← 改这里 */
    z-index: 0;
    pointer-events: none;
    display: none;
    filter: drop-shadow(0 4px 8px var(--ct-glow));
  }
  .card-bg-img-t {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 85%; height: 85%;
    object-fit: contain;
    opacity: var(--bg-img-opacity, 0.3);   /* ← 改这里 */
    z-index: 0;
    pointer-events: none;
    display: none;
    filter: drop-shadow(0 4px 8px var(--t-glow));
  }
  .card-header {
    position: relative;
    z-index: 1;
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 18px;
    border-bottom: 1px solid rgba(255,255,255,0.3);
    flex-shrink: 0;
  }
  .ct-top { box-shadow: inset 0 3px 0 0 var(--ct-shadow); }
  .t-top { box-shadow: inset 0 3px 0 0 var(--t-shadow); }
  .header-left { display: flex; align-items: center; gap: 8px; }
  .icon {
    width: 22px; height: 22px; border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 800;
  }
  .ct-icon { background: var(--ct-bg); color: var(--ct-primary); border: 1px solid var(--ct-border); }
  .t-icon { background: var(--t-bg); color: var(--t-primary); border: 1px solid var(--t-border); }
  .team-name {
    font-size: 14px; font-weight: 700;
    letter-spacing: 0.04em; color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 6em;
  }
  .score-box { display: flex; align-items: center; gap: 6px; }
  .score-self { font-size: 18px; font-weight: 800; font-variant-numeric: tabular-nums; }
  .score-ct { color: var(--ct-primary);text-shadow: 0 0 3px var(--ct-glow); }
  .score-t { color: var(--t-primary); text-shadow: 0 0 3px var(--t-glow);}
  .score-sep { color: rgba(255,255,255,0.2); font-size: 12px; }
  .score-opp { font-size: 18px; font-weight: 800; font-variant-numeric: tabular-nums; color: rgba(255,255,255,0.4); }
  .table-head {
    position: relative;
    z-index: 1;
    display: grid; grid-template-columns: 1fr 48px 48px 48px 56px 52px; gap: 4px;
    padding: 8px 18px; font-size: 10px; color: #ffffff;
    text-transform: uppercase; letter-spacing: 0.12em; font-weight: 600;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    align-items: center;
    flex-shrink: 0;
  }
  .th-right { text-align: right; }
.th-icon { 
  width: 11px; height: 11px; 
  display: inline-block; vertical-align: middle; 
  margin-right: 2px; 
  color: #fff;   /* ← 加这行，配合 currentColor 使用 */
 } 
  .rows { position: relative; z-index: 1; flex: 1; overflow-y: auto; }
  .table-row {
    position: relative; z-index: 1;
    display: grid; grid-template-columns: 1fr 48px 48px 48px 56px 52px; gap: 4px;
    padding: 8px 18px; align-items: center;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    transition: background 0.15s;
  }
  .table-row:hover { background: rgba(255,255,255,0.03); }
  .row-left { display: flex; align-items: center; gap: 6px; min-width: 0; }
  .rank { font-size: 9px; color: #ffffff; font-family: 'JetBrains Mono', monospace; width: 14px; flex-shrink: 0; }
  .p-name { font-size: 12px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .name-normal { color: #ffffff; }
  .name-top-ct { 
    color: rgb(var(--ct-rgb)); 
    font-weight: 600; 
    text-shadow: 0 0 3px var(--ct-glow);
  }
  .name-top-t { 
    color: rgb(var(--t-rgb)); 
    font-weight: 600; 
    text-shadow: 0 0 3px var(--t-glow);
  }
  .mvp-tag {
    font-size: 8px; font-weight: 800; padding: 1px 4px; border-radius: 3px;
    text-transform: uppercase; letter-spacing: 0.05em; flex-shrink: 0;
  }
  .mvp-ct { background: var(--ct-bg); color: var(--ct-primary); border: 1px solid var(--ct-border); }
  .mvp-t { background: var(--t-bg); color: var(--t-primary); border: 1px solid var(--t-border); }
  .stat { font-family: 'JetBrains Mono', monospace; font-size: 12px; text-align: right; }
  .stat-k { color: #ffffff; }
  .stat-d { color: #ffffff; }
  .stat-a { color: #ffffff; }
  .stat-top { font-weight: 700; }
  .stat-top-ct { color: var(--ct-primary); text-shadow: 0 0 3px var(--ct-glow);}
  .stat-top-t { color: var(--t-primary); text-shadow: 0 0 3px var(--t-glow);}
  .empty { text-align: center; color: #475569; padding: 40px 18px; font-size: 13px; }
  .offline { color: #FF5252; font-size: 16px; text-align: center; padding: 60px 20px; }
</style>
</head>
<body>
<div class="top-panel" id="top-panel">
  <div class="scoreboard-wrapper">
    <div class="scoreboard-bg" id="scoreboard-bg"></div>
    <div class="scoreboard-card" id="scoreboard-card">
      <div class="teams-row">
        <div class="team-lg ct" id="main-ct">CT TEAM</div>
        <div class="big-score" id="main-score">0 : 0</div>
        <div class="team-lg t" id="main-t">T TEAM</div>
      </div>
      <div class="meta" id="meta">Map 1 / BO3</div>
      <div class="map-score-row">
        <span class="map-score-ct" id="map-ct">0</span>
        <span class="map-sep">:</span>
        <span class="map-score-t" id="map-t">0</span>
      </div>
    </div>
  </div>
</div>

  <div class="boards" id="boards">
    <div class="board-content" id="board-content">
      <div class="card ct-top">
        <img class="card-bg-img-ct" src="" alt="" style="display:none;">
        <div class="card-header">
          <div class="header-left">
            <div class="icon ct-icon">CT</div>
            <div class="team-name" id="ct-name">CT TEAM</div>
          </div>
          <div class="score-box">
            <span class="score-self score-ct" id="ct-score">0</span>
            <span class="score-sep">:</span>
            <span class="score-opp" id="ct-opp">0</span>
          </div>
        </div>
      <div class="table-head">
        <span>Player</span>
        <span class="th-right"><svg class="th-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="3" x2="12" y2="9"/><line x1="12" y1="15" x2="12" y2="21"/><line x1="3" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="21" y2="12"/></svg>K</span>
        <span class="th-right"><svg class="th-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v1a1 1 0 0 0 1 1z"/><path d="m12.5 17-.5-1-.5 1h1z"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="12" r="1"/></svg>D</span>
        <span class="th-right"><svg class="th-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 12h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 14"/><path d="m7 18 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"/><path d="m2 13 6 6"/></svg>A</span>
        <span class="th-right">K/D</span>
        <span class="th-right">ADR</span>
      </div>
        <div class="rows" id="ct-rows"><div class="empty">waiting...</div></div>
      </div>

      <div class="card t-top">
        <img class="card-bg-img-t" src="" alt="" style="display:none;">
        <div class="card-header">
          <div class="header-left">
            <div class="icon t-icon">T</div>
            <div class="team-name" id="t-name">T TEAM</div>
          </div>
          <div class="score-box">
            <span class="score-self score-t" id="t-score">0</span>
            <span class="score-sep">:</span>
            <span class="score-opp" id="t-opp">0</span>
          </div>
        </div>
      <div class="table-head">
        <span>Player</span>
        <span class="th-right"><svg class="th-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="3" x2="12" y2="9"/><line x1="12" y1="15" x2="12" y2="21"/><line x1="3" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="21" y2="12"/></svg>K</span>
        <span class="th-right"><svg class="th-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v1a1 1 0 0 0 1 1z"/><path d="m12.5 17-.5-1-.5 1h1z"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="12" r="1"/></svg>D</span>
        <span class="th-right"><svg class="th-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 12h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 14"/><path d="m7 18 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"/><path d="m2 13 6 6"/></svg>A</span>
        <span class="th-right">K/D</span>
        <span class="th-right">ADR</span>
      </div>
        <div class="rows" id="t-rows"><div class="empty">waiting...</div></div>
      </div>
    </div>
  </div>
<script>
  const $ = id => document.getElementById(id);
  
  function updateColors(d) {
    var r = document.documentElement;
    
    var extractRgb = function(str) {
      if (!str) return '0, 0, 0';
      if (str.charAt(0) === '#') {
        var hex = str.slice(1);
        var num = parseInt(hex, 16);
        return ((num >> 16) & 255) + ', ' + ((num >> 8) & 255) + ', ' + (num & 255);
      }
      var m = str.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
      return m ? (m[1] + ', ' + m[2] + ', ' + m[3]) : '0, 0, 0';
    };

    if (d.colors && d.colors.ct && (d.colors.ct.primary || d.colors.ct.alpha)) {
      r.style.setProperty('--ct-rgb', extractRgb(d.colors.ct.primary || d.colors.ct.alpha));
    }
    if (d.colors && d.colors.t && (d.colors.t.primary || d.colors.t.alpha)) {
      r.style.setProperty('--t-rgb', extractRgb(d.colors.t.primary || d.colors.t.alpha));
    }

    if (d.colors && d.colors.ct) {
      r.style.setProperty('--ct-primary', d.colors.ct.primary);
      r.style.setProperty('--ct-glow', d.colors.ct.glow);
      r.style.setProperty('--ct-bg', d.colors.ct.bg);
      r.style.setProperty('--ct-border', d.colors.ct.border);
      r.style.setProperty('--ct-shadow', d.colors.ct.shadow);
      r.style.setProperty('--ct-alpha', d.colors.ct.alpha);
    }
    if (d.colors && d.colors.t) {
      r.style.setProperty('--t-primary', d.colors.t.primary);
      r.style.setProperty('--t-glow', d.colors.t.glow);
      r.style.setProperty('--t-bg', d.colors.t.bg);
      r.style.setProperty('--t-border', d.colors.t.border);
      r.style.setProperty('--t-shadow', d.colors.t.shadow);
      r.style.setProperty('--t-alpha', d.colors.t.alpha);
    }
    r.style.setProperty('--bg-img-opacity', d.bgImgOpacity !== undefined ? d.bgImgOpacity : 0.3);
  }
  
  async function tick() {
    try {
      const r = await fetch('http://127.0.0.1:8080/api/state');
      const d = await r.json();
      render(d);
    } catch(e) {
      $('top-panel').style.display = 'none';
      $('boards').innerHTML = '<div class="offline">Waiting for Scoreboard...</div>';
    }
  }
  function render(d) {
    if (!d.gsiConnected && d.teamLeft.players.length === 0 && d.teamRight.players.length === 0) {
      $('top-panel').style.display = 'none';
      $('board-content').innerHTML = '<div class="offline">GSI Unconnected</div>';
      return;
    }
    
    $('top-panel').style.display = 'block';
    updateColors(d);
    
    const opacity = typeof d.bgOpacity === 'number' ? d.bgOpacity : 1;
    document.querySelectorAll('.card').forEach(el => {
      el.style.background = 'rgba(20, 20, 24, ' + opacity + ')';
    });
    $('scoreboard-bg').style.background = 'rgba(20, 20, 24, ' + opacity + ')';
    $('scoreboard-card').style.background = 'linear-gradient(90deg, ' +
      'rgb(var(--ct-rgb)) 0%, ' +
      'rgba(var(--ct-rgb), 0.8) 1%, ' +
      'rgba(20, 20, 24, 0) 10%, ' +
      'rgba(20, 20, 24, 0) 35%, ' +
      'rgba(20, 20, 24, 0) 65%, ' +
      'rgba(20, 20, 24, 0) 90%, ' +
      'rgba(var(--t-rgb), 0.8) 99%, ' +
      'rgb(var(--t-rgb)) 100%)';

    const ctImg = document.querySelector('.card-bg-img-ct');
    if (ctImg) {
      if (d.ctBgVisible !== false && d.ctBgName) {
        ctImg.src = 'http://127.0.0.1:8080/' + d.ctBgName;
        ctImg.style.display = 'block';
      } else {
        ctImg.style.display = 'none';
      }
    }
    const tImg = document.querySelector('.card-bg-img-t');
    if (tImg) {
      if (d.tBgVisible !== false && d.tBgName) {
        tImg.src = 'http://127.0.0.1:8080/' + d.tBgName;
        tImg.style.display = 'block';
      } else {
        tImg.style.display = 'none';
      }
    }
    
    $('main-ct').textContent = d.teamLeft.name;
    $('main-t').textContent = d.teamRight.name;
    $('main-score').textContent = d.teamLeft.score + ' : ' + d.teamRight.score;
    $('meta').textContent = 'Map ' + d.currentMap + ' / ' + d.format;
    $('map-ct').textContent = d.teamLeft.mapScore;
    $('map-t').textContent = d.teamRight.mapScore;
    
    $('ct-name').textContent = d.teamLeft.name;
    $('t-name').textContent = d.teamRight.name;
    $('ct-score').textContent = d.teamLeft.mapScore;
    $('ct-opp').textContent = d.teamRight.mapScore;
    $('t-score').textContent = d.teamRight.mapScore;
    $('t-opp').textContent = d.teamLeft.mapScore;
    
    const leftWin = d.teamLeft.mapScore > d.teamRight.mapScore;
    const rightWin = d.teamRight.mapScore > d.teamLeft.mapScore;
    
    const ctPlayers = [...d.teamLeft.players].sort((a, b) => (b.adr || 0) - (a.adr || 0));
    const tPlayers = [...d.teamRight.players].sort((a, b) => (b.adr || 0) - (a.adr || 0));
    
    const calcKd = (p) => {
      if (p.kd) return p.kd;
      const raw = p.deaths ? p.kills / p.deaths : p.kills;
      return Math.floor(raw * 100) / 100;
    };
    
    const allPlayers = [...ctPlayers, ...tPlayers];
    const globalTopKd = allPlayers.length ? Math.max(...allPlayers.map(p => calcKd(p))) : 0;
    const globalTopAdr = allPlayers.length ? Math.max(...allPlayers.map(p => p.adr || 0)) : 0;
    
    $('ct-rows').innerHTML = ctPlayers.length ? 
      ctPlayers.map((p, i) => {
        const playerKd = calcKd(p);
        const isGlobalKdTop = playerKd === globalTopKd && globalTopKd > 0;
        const isGlobalAdrTop = (p.adr || 0) === globalTopAdr && globalTopAdr > 0;
        const isMvp = d.showMvp && leftWin && d.mvp && d.mvp.name === p.name;
        const nameClass = isMvp ? 'name-top-ct' : 'name-normal';
        
        const kdVal = playerKd.toFixed(2);
        const kdClass = isGlobalKdTop ? 'stat-top stat-top-ct' : (playerKd >= 1.0 ? '' : 'stat-kd-bad');
        const adrClass = isGlobalAdrTop ? 'stat-top stat-top-ct' : '';
        
        return '<div class="table-row"><div class="row-left"><span class="rank">' + (i+1) + '</span><span class="p-name ' + nameClass + '">' + p.name + '</span>' + (isMvp ? '<span class="mvp-tag mvp-ct">MVP</span>' : '') + '</div><span class="stat stat-k">' + p.kills + '</span><span class="stat stat-d">' + p.deaths + '</span><span class="stat stat-a">' + (p.assists||0) + '</span><span class="stat ' + kdClass + '">' + kdVal + '</span><span class="stat ' + adrClass + '">' + (p.adr || 0) + '</span></div>';
      }).join('') : '<div class="empty">waiting for stat...</div>';
      
    $('t-rows').innerHTML = tPlayers.length ? 
      tPlayers.map((p, i) => {
        const playerKd = calcKd(p);
        const isGlobalKdTop = playerKd === globalTopKd && globalTopKd > 0;
        const isGlobalAdrTop = (p.adr || 0) === globalTopAdr && globalTopAdr > 0;
        const isMvp = d.showMvp && rightWin && d.mvp && d.mvp.name === p.name;
        const nameClass = isMvp ? 'name-top-t' : 'name-normal';
        
        const kdVal = playerKd.toFixed(2);
        const kdClass = isGlobalKdTop ? 'stat-top stat-top-t' : (playerKd >= 1.0 ? '' : 'stat-kd-bad');
        const adrClass = isGlobalAdrTop ? 'stat-top stat-top-t' : '';
        
        return '<div class="table-row"><div class="row-left"><span class="rank">' + (i+1) + '</span><span class="p-name ' + nameClass + '">' + p.name + '</span>' + (isMvp ? '<span class="mvp-tag mvp-t">MVP</span>' : '') + '</div><span class="stat stat-k">' + p.kills + '</span><span class="stat stat-d">' + p.deaths + '</span><span class="stat stat-a">' + (p.assists||0) + '</span><span class="stat ' + kdClass + '">' + kdVal + '</span><span class="stat ' + adrClass + '">' + (p.adr || 0) + '</span></div>';
      }).join('') : '<div class="empty">waiting for stat...</div>';
  }
  tick();
  setInterval(tick, 500);
</script>
</body>
</html>`;
}

function generateNameHtml() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Quantico:wght@700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 100vw; height: 100vh;
    display: flex; align-items: center; justify-content: center;
    background: transparent;
    overflow: hidden;
  }
  .name-box {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    font-size: 200px;
    line-height: 1;
  }
  /* 底层：纯黑色 12px 轮廓 */
  .name-stroke {
    position: absolute;
    font-family: 'Quantico', sans-serif;
    font-weight: 700;
    -webkit-text-stroke: 12px black;
    color: transparent;
    pointer-events: none;
  }
  /* 上层：白到灰渐变填充 */
  .name-fill {
    position: relative;
    font-family: 'Quantico', sans-serif;
    font-weight: 700;
    background: linear-gradient(180deg, #FFFFFF 0%, #A8A8A8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
</style>
</head>
<body>
<div class="name-box" id="box">
  <div class="name-stroke" id="stroke">TEAM</div>
  <div class="name-fill" id="fill">TEAM</div>
</div>
<script>
  const isLeft = location.pathname === '/name1';
  const box = document.getElementById('box');
  const stroke = document.getElementById('stroke');
  const fill = document.getElementById('fill');

  function fit() {
    const parent = box.parentElement;
    let size = 300;
    box.style.fontSize = size + 'px';
    while (size > 10 && (box.scrollWidth > parent.clientWidth || box.scrollHeight > parent.clientHeight)) {
      size -= 2;
      box.style.fontSize = size + 'px';
    }
  }

  async function tick() {
    try {
      const r = await fetch('/api/state');
      const d = await r.json();
      const newName = isLeft ? d.teamLeft.name : d.teamRight.name;
      if (fill.textContent !== newName) {
        fill.textContent = newName;
        stroke.textContent = newName;
        fit();
      }
    } catch(e) {}
  }

  window.addEventListener('load', () => { tick(); });
  window.addEventListener('resize', fit);
  setInterval(tick, 500);
</script>
</body>
</html>`;
}

function generateBpHtml() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<style>
  @font-face {
    font-family: 'Quantico';
    font-style: normal;
    font-weight: 700;
    font-display: swap;
    src: url('/fonts/quantico-bold.ttf') format('truetype');
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Quantico', sans-serif;
    font-weight: 700;
    width: 1920px; height: 1080px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: transparent;
    padding-top: 10px;
  }

  :root {
    --bp-dark: #292727;
    --bp-mid: #6b4226;
    --bp-light: #b26500;
    --title-start: #fff700;
    --title-end: #eb8100;
    --team-bar-start: #0c2d63;
    --team-bar-end: #0a2249;
    --decider-tag: #ffc107;
    --decider-text: #191919;
    --ban-tag: #dc2626;
    --ban-text: #ffffff;
    --pick-tag: #22c55e;
    --pick-text: #ffffff;
  }

  /* ===== 标题 ===== */
  .title-box {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
  }
  .title-stroke {
    position: absolute;
    font-size: 100px;
    font-weight: 700;
    letter-spacing: 0.02em;
    -webkit-text-stroke: 6px #191919;
    color: transparent;
    white-space: nowrap;
  }
  .title-fill {
    position: relative;
    font-size: 100px;
    font-weight: 700;
    letter-spacing: 0.02em;
    background: linear-gradient(90deg, var(--title-start) 0%, var(--title-end) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    white-space: nowrap;
  }

  /* ===== 地图行 ===== */
  .maps-row {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 8px;
    height: 650px;
    padding: 0 20px;
  }

  /* ===== 地图卡片 ===== */
  .map-card {
    position: relative;
    width: 261px;
    height: 650px;
    border-radius: 4px;
    overflow: hidden;
    flex-shrink: 0;
  }

  /* ===== 基础图层 ===== */
  .bg-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 0;
  }

  /* ===== PICK / DECIDER ===== */
  .map-card.pick .bg-img,
  .map-card.decider .bg-img {
    filter: none;
  }
  .pick-overlay, .decider-overlay {
    position: absolute;
    inset: 0;
    z-index: 2;
    pointer-events: none;
  }
  .pick-overlay {
    background: linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.2) 100%);
  }
  .decider-overlay {
    background: linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.28) 100%);
  }

  /* ===== BAN + Mono ===== */
  .map-card.ban-mono .bg-img {
    filter: grayscale(100%) brightness(0.35) contrast(1.2);
  }
  .ban-mono-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 100%);
    z-index: 2;
    pointer-events: none;
  }

  /* ===== BAN + 3-Color Stylized ===== */
  .map-card.ban-stylized .bg-img {
    filter: grayscale(100%) contrast(1.12) brightness(0.88);
  }
  .bg-img-blur {
    position: absolute;
    inset: -8%;
    width: 116%;
    height: 116%;
    object-fit: cover;
    filter: blur(10px) grayscale(100%) contrast(0.85);
    opacity: 0.4;
    mix-blend-mode: screen;
    z-index: 1;
  }
  .tritone-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      var(--bp-light) 0%,
      var(--bp-mid) 48%,
      var(--bp-dark) 100%
    );
    mix-blend-mode: color;
    z-index: 2;
    pointer-events: none;
  }
  .ban-stylized-overlay {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse at 50% 40%, transparent 20%, rgba(0,0,0,0.5) 100%),
      linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.3) 100%);
    z-index: 3;
    pointer-events: none;
  }

  /* ===== BAN + CRT Monitor: Retro-Futuristic Glitch ===== */
  .map-card.ban-glitch {
    background: #0a0a0e;
  }
  /* Chromatic Aberration via drop-shadow - OBS compatible */
  .map-card.ban-glitch .bg-img {
    filter: grayscale(100%) contrast(1.5) brightness(0.7)
            drop-shadow(4px 0 2px rgba(220, 50, 50, 0.55))
            drop-shadow(-4px 0 2px rgba(50, 140, 255, 0.45));
    animation: chromShift 4s steps(1) infinite;
  }
  @keyframes chromShift {
    0%, 85% { filter: grayscale(100%) contrast(1.5) brightness(0.5) drop-shadow(4px 0 2px rgba(220,50,50,0.55)) drop-shadow(-4px 0 2px rgba(50,140,255,0.45)); }
    87% { filter: grayscale(100%) contrast(1.5) brightness(0.5) drop-shadow(7px 0 2px rgba(220,50,50,0.6)) drop-shadow(-2px 0 2px rgba(50,140,255,0.4)); }
    89% { filter: grayscale(100%) contrast(1.5) brightness(0.5) drop-shadow(3px 0 2px rgba(220,50,50,0.5)) drop-shadow(-6px 0 2px rgba(50,140,255,0.5)); }
    91% { filter: grayscale(100%) contrast(1.5) brightness(0.5) drop-shadow(4px 0 2px rgba(220,50,50,0.55)) drop-shadow(-4px 0 2px rgba(50,140,255,0.45)); }
    93% { filter: grayscale(100%) contrast(1.5) brightness(0.5) drop-shadow(8px 0 2px rgba(220,50,50,0.6)) drop-shadow(-1px 0 2px rgba(50,140,255,0.4)); }
    95% { filter: grayscale(100%) contrast(1.5) brightness(0.5) drop-shadow(4px 0 2px rgba(220,50,50,0.55)) drop-shadow(-4px 0 2px rgba(50,140,255,0.45)); }
    100% { filter: grayscale(100%) contrast(1.5) brightness(0.5) drop-shadow(4px 0 2px rgba(220,50,50,0.55)) drop-shadow(-4px 0 2px rgba(50,140,255,0.45)); }
  }

  /* 2. CRT Scanlines */
  .crt-scanlines {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent 0px,
      transparent 1px,
      rgba(0,0,0,0.25) 1px,
      rgba(0,0,0,0.25) 3px
    );
    z-index: 3;
    pointer-events: none;
    opacity: 0;
  }
  .map-card.ban-glitch .crt-scanlines {
    opacity: 1;
    animation: scanlineMove 5s linear infinite;
  }
  @keyframes scanlineMove {
    0%   { background-position: 0 0; }
    100% { background-position: 0 60px; }
  }

  /* 3. Pixel Grid Texture */
  .crt-grid {
    position: absolute;
    inset: 0;
    background-image:
      radial-gradient(circle, rgba(255,255,255,0.04) 0.5px, transparent 0.5px);
    background-size: 3px 3px;
    z-index: 4;
    pointer-events: none;
    opacity: 0;
  }
  .map-card.ban-glitch .crt-grid { opacity: 1; }

  /* 4. Scan Beam */
  .crt-beam {
    position: absolute;
    left: 0; right: 0;
    height: 6px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255,255,255,0.06) 20%,
      rgba(255,255,255,0.12) 50%,
      rgba(255,255,255,0.06) 80%,
      transparent 100%
    );
    z-index: 5;
    pointer-events: none;
    top: -10%;
    opacity: 0;
  }
  .map-card.ban-glitch .crt-beam {
    animation: beamSweep 4s ease-in-out infinite;
  }
  @keyframes beamSweep {
    0%   { top: -10%; opacity: 0; }
    10%  { opacity: 0.6; }
    90%  { opacity: 0.6; }
    100% { top: 110%; opacity: 0; }
  }

  /* 5. CRT Vignette + Glow */
  .crt-vignette {
    position: absolute;
    inset: 0;
    background:
      /* CRT barrel distortion vignette */
      radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.5) 75%, rgba(0,0,0,0.8) 100%),
      /* subtle phosphor tint */
      linear-gradient(180deg, rgba(0, 30, 20, 0.15) 0%, transparent 50%, rgba(0, 30, 20, 0.15) 100%);
    z-index: 6;
    pointer-events: none;
    opacity: 0;
  }
  .map-card.ban-glitch .crt-vignette { opacity: 1; }

  /* 6. Screen Flicker (subtle) */
  .map-card.ban-glitch .bg-img {
    animation: screenFlicker 5s steps(1) infinite;
  }
  @keyframes screenFlicker {
    0%, 96%  { opacity: 1; }
    97%      { opacity: 0.88; }
    98%      { opacity: 1; }
    99%      { opacity: 0.94; }
    100%     { opacity: 1; }
  }

  /* 7. Ban Overlay + X */
  .crt-ban-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      rgba(180, 30, 30, 0.08) 0%,
      transparent 40%,
      transparent 60%,
      rgba(180, 30, 30, 0.1) 100%
    );
    z-index: 7;
    pointer-events: none;
  }
  .glitch-x {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    font-size: 120px;
    font-weight: 800;
    color: rgba(220, 38, 38, 0.25);
    text-shadow:
      2px 0 0 rgba(255, 0, 0, 0.3),
      -2px 0 0 rgba(0, 255, 255, 0.3),
      0 0 20px rgba(220, 38, 38, 0.4);
    z-index: 8;
    pointer-events: none;
    line-height: 1;
  }

  /* ===== 顶部队名区 ===== */
  .team-bar {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 92px;
    background: linear-gradient(180deg, var(--team-bar-start) 0%, var(--team-bar-end) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 10px;
    z-index: 10;
    overflow: hidden;
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.2),
      inset 0 -2px 0 rgba(0,0,0,0.5),
      0 6px 20px rgba(0,0,0,0.4);
  }

  /* 顶部高光线条 - 呼吸效果 */
  .team-bar::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent 0%, rgba(120,190,255,0.6) 25%, rgba(200,230,255,0.9) 50%, rgba(120,190,255,0.6) 75%, transparent 100%);
    z-index: 5;
    pointer-events: none;
    animation: highlightPulse 4s ease-in-out infinite;
  }
  @keyframes highlightPulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }

  /* 双层点阵 - transform版（GPU加速，丝滑流畅） */
  .team-bar-dots {
    position: absolute;
    inset: -20px;
    z-index: 1;
    pointer-events: none;
    overflow: hidden;
  }
  .team-bar-dots::before,
  .team-bar-dots::after {
    content: '';
    position: absolute;
    inset: 0;
    will-change: transform;
  }
  .team-bar-dots::before {
    background-image: radial-gradient(circle, rgba(255,255,255,0.10) 1.2px, transparent 1.2px);
    background-size: 12px 12px;
    animation: dotSlide1 30s linear infinite;
  }
  .team-bar-dots::after {
    background-image: radial-gradient(circle, rgba(255,255,255,0.05) 0.7px, transparent 0.7px);
    background-size: 6px 6px;
    animation: dotSlide2 30s linear infinite;
  }
  @keyframes dotSlide1 {
    0%   { transform: translate3d(0, 0, 0); }
    100% { transform: translate3d(60px, 60px, 0); }
  }
  @keyframes dotSlide2 {
    0%   { transform: translate3d(0, 0, 0); }
    100% { transform: translate3d(-40px, -40px, 0); }
  }

  /* 扫光 - 从左到右，不停留 */
  .team-bar-sheen {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(105deg,
      transparent 0%,
      transparent 38%,
      rgba(255,255,255,0.06) 44%,
      rgba(255,255,255,0.14) 50%,
      rgba(255,255,255,0.06) 56%,
      transparent 62%,
      transparent 100%
    );
    animation: sheenSweep 7s ease-in-out infinite;
    pointer-events: none;
    z-index: 3;
    mix-blend-mode: overlay;
  }
  @keyframes sheenSweep {
    0% { transform: translateX(-120%); }
    100% { transform: translateX(220%); }
  }

  .team-name-box {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    z-index: 10;
  }
  .team-name-stroke {
    position: absolute;
    font-size: 40px;
    font-weight: 700;
    -webkit-text-stroke: 6px black;
    color: transparent;
    white-space: nowrap;
  }
  .team-name-fill {
    position: relative;
    font-size: 40px;
    font-weight: 700;
    background: linear-gradient(180deg, #FFFFFF 0%, #9a9a9a 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    white-space: nowrap;
  }

  /* ===== 标签 glow ===== */
  .tag-wrap {
    position: absolute;
    top: 92px;
    right: 0;
    width: 130px;
    height: 44px;
    z-index: 11;
    filter:
      drop-shadow(0 0 3px var(--tag-glow-1, rgba(255,255,255,0.4)))
      drop-shadow(0 0 8px var(--tag-glow-2, rgba(255,255,255,0.2)));
  }
  .tag-wrap-ban {
    --tag-glow-1: color-mix(in srgb, var(--ban-tag) 55%, transparent);
    --tag-glow-2: color-mix(in srgb, var(--ban-tag) 25%, transparent);
  }
  .tag-wrap-pick {
    --tag-glow-1: color-mix(in srgb, var(--pick-tag) 55%, transparent);
    --tag-glow-2: color-mix(in srgb, var(--pick-tag) 25%, transparent);
  }
  .tag-wrap-decider {
    --tag-glow-1: color-mix(in srgb, var(--decider-tag) 55%, transparent);
    --tag-glow-2: color-mix(in srgb, var(--decider-tag) 25%, transparent);
  }

  .tag {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    font-weight: 700;
    text-transform: capitalize;
    letter-spacing: 0.04em;
    clip-path: polygon(8px 0, 100% 0, 100% 100%, 0 100%, 0 8px);
    box-shadow: 
      inset 0 0 0 1px rgba(255,255,255,0.35),
      inset 0 0 8px rgba(255,255,255,0.08);
    position: relative;
  }
  .tag::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1.5px;
    background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 30%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.5) 70%, transparent 100%);
    pointer-events: none;
  }
  .tag-ban {
    background: linear-gradient(180deg, var(--ban-tag) 0%, color-mix(in srgb, var(--ban-tag), #000 25%) 100%);
    color: var(--ban-text);
  }
  .tag-pick {
    background: linear-gradient(180deg, var(--pick-tag) 0%, color-mix(in srgb, var(--pick-tag), #000 25%) 100%);
    color: var(--pick-text);
  }
  .tag-decider {
    background: linear-gradient(180deg, var(--decider-tag) 0%, color-mix(in srgb, var(--decider-tag), #000 25%) 100%);
    color: var(--decider-text);
  }

  /* ===== 地图 Logo ===== */
  .map-logo {
    position: absolute;
    left: 50%;
    bottom: 100px;
    transform: translateX(-50%);
    width: 150px;
    height: 150px;
    object-fit: contain;
    z-index: 11;
    filter: drop-shadow(0 4px 16px rgba(0,0,0,0.7));
  }

  /* ===== 选边显示（Pick卡片）- 高可见度版 ===== */
  .side-bar {
    position: absolute;
    bottom: 22px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 12;
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 14px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.04em;
    white-space: nowrap;
    pointer-events: none;
    background: rgba(10, 10, 14, 0.75);
    border: 2px solid;
    text-shadow: 0 1px 4px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.8);
  }
  .side-bar-ct {
    color: #fff;
    border-color: rgba(0, 240, 255, 0.65);
    box-shadow: 0 0 10px rgba(0, 240, 255, 0.2), inset 0 0 6px rgba(0, 240, 255, 0.06);
  }
  .side-bar-ct .side-icon {
    color: #00F0FF;
    filter: drop-shadow(0 0 4px rgba(0, 240, 255, 0.5));
  }
  .side-bar-t {
    color: #fff;
    border-color: rgba(255, 145, 0, 0.65);
    box-shadow: 0 0 10px rgba(255, 145, 0, 0.2), inset 0 0 6px rgba(255, 145, 0, 0.06);
  }
  .side-bar-t .side-icon {
    color: #FF9100;
    filter: drop-shadow(0 0 4px rgba(255, 145, 0, 0.5));
  }
  .side-icon {
    width: 14px;
    height: 14px;
    stroke: currentColor;
    stroke-width: 2.2;
    fill: none;
    flex-shrink: 0;
  }

  /* ===== FINAL MAP 文字（Decider） ===== */
  .final-map-text {
    position: absolute;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 12;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.2em;
    color: rgba(255, 193, 7, 0.85);
    text-shadow: 0 0 12px rgba(255, 193, 7, 0.3), 0 0 4px rgba(0,0,0,0.8);
    pointer-events: none;
  }

  /* ===== 入场动画：严格串行，visibility 确保动画前完全不渲染 ===== */
  .card-pending {
    visibility: hidden;
    opacity: 0;
    transform: translateY(80px);
  }
  .card-entering {
    visibility: visible;
    opacity: 1;
    transform: translateY(0);
    transition: opacity 0.3s ease-out, transform 0.35s ease-out;
  }
  .maps-row {
    transition: opacity 0.4s ease;
  }
  .maps-row.hidden {
    opacity: 0;
    pointer-events: none;
  }
</style>
</head>
<body>
  <div class="title-box">
    <div class="title-stroke">Ban&Pick</div>
    <div class="title-fill">Ban&Pick</div>
  </div>

  <div class="maps-row" id="maps-row"></div>

<script>
  function fitText(strokeEl, fillEl, maxWidth) {
    var size = 40;
    strokeEl.style.fontSize = size + 'px';
    fillEl.style.fontSize = size + 'px';
    while (size > 10 && fillEl.scrollWidth > maxWidth) {
      size -= 1;
      strokeEl.style.fontSize = size + 'px';
      fillEl.style.fontSize = size + 'px';
    }
  }

  function getSeqKey(bp) {
    if (!bp || !bp.sequence) return '';
    return bp.sequence.map(function(s) {
      return s.map + ':' + (s.action || '') + ':' + (s.team || '') + ':' + (s.side || '');
    }).join('|');
  }

  function createCard(item, style, leftName, rightName, index, total, animated) {
    var displayName = item.action === 'decider' ? 'Decider'
      : (item.team === 'left' ? leftName : rightName);

    var tagClass = item.action === 'ban' ? 'tag-ban'
      : item.action === 'pick' ? 'tag-pick'
      : 'tag-decider';
    var tagText = item.action === 'ban' ? 'Ban'
      : item.action === 'pick' ? 'Pick'
      : 'Decider';

    var cardClass = item.action === 'ban'
      ? (style === 'stylized' ? 'ban-stylized' : style === 'glitch' ? 'ban-glitch' : 'ban-mono')
      : item.action === 'pick' ? 'pick'
      : 'decider';

    var tagWrapClass = item.action === 'ban' ? 'tag-wrap-ban'
      : item.action === 'pick' ? 'tag-wrap-pick'
      : 'tag-wrap-decider';

    var safeMap = item.map.replace(/[^a-zA-Z0-9]/g, '');

    var card = document.createElement('div');
    card.className = 'map-card ' + cardClass + (animated ? ' card-pending' : '');
    card.dataset.map = safeMap;

    var inner = '<img class="bg-img" src="/maps/bp/' + item.map + '.png" alt="' + item.map + '" onerror="this.style.display=\\'none\\'">';

    if (item.action === 'ban' && style === 'stylized') {
      inner += '<img class="bg-img-blur" src="/maps/bp/' + item.map + '.png" alt="" onerror="this.style.display=\\'none\\'">';
      inner += '<div class="tritone-overlay"></div>';
      inner += '<div class="ban-stylized-overlay"></div>';
    } else if (item.action === 'ban' && style === 'glitch') {
      inner += '<div class="crt-scanlines"></div>';
      inner += '<div class="crt-grid"></div>';
      inner += '<div class="crt-beam"></div>';
      inner += '<div class="crt-vignette"></div>';
      inner += '<div class="crt-ban-overlay"></div>';
      inner += '<div class="glitch-x">&#x2715;</div>';
    } else if (item.action === 'ban' && style === 'mono') {
      inner += '<div class="ban-mono-overlay"></div>';
    } else if (item.action === 'pick') {
      inner += '<div class="pick-overlay"></div>';
    } else if (item.action === 'decider') {
      inner += '<div class="decider-overlay"></div>';
    }

    inner += '<div class="team-bar">' +
      '<div class="team-bar-dots"></div>' +
      '<div class="team-bar-sheen"></div>' +
      '<div class="team-name-box">' +
        '<div class="team-name-stroke" id="stroke-' + safeMap + '">' + displayName + '</div>' +
        '<div class="team-name-fill" id="fill-' + safeMap + '">' + displayName + '</div>' +
      '</div>' +
    '</div>';

    inner += '<div class="tag-wrap ' + tagWrapClass + '">' +
      '<div class="tag ' + tagClass + '">' + tagText + '</div>' +
    '</div>';

    inner += '<img class="map-logo" src="/maps/logo/' + item.map + '.png" alt="' + item.map + ' logo" onerror="this.style.display=\\'none\\'">';

    if (item.action === 'pick' && item.side) {
      var oppName = item.team === 'left' ? rightName : leftName;
      if (item.side === 'ct') {
        inner += '<div class="side-bar side-bar-ct">' +
          '<svg class="side-icon" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' +
          oppName + ' CT</div>';
      } else {
        inner += '<div class="side-bar side-bar-t">' +
          '<svg class="side-icon" viewBox="0 0 24 24"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a6 6 0 0 1-12 0c0-1.5.5-2.5 1.5-3.5"/></svg>' +
          oppName + ' T</div>';
      }
    }

    if (item.action === 'decider') {
      inner += '<div class="final-map-text">FINAL MAP</div>';
    }

    card.innerHTML = inner;
    return card;
  }

  var prevKey = null;
  var prevStyle = null;
  var prevCardsVisible = null;
  var isFirstRender = true;

  function render(d) {
    var row = document.getElementById('maps-row');
    if (!row) return;

    var bp = d.bp || { sequence: [] };
    var leftName = d.teamLeft && d.teamLeft.name || 'CT TEAM';
    var rightName = d.teamRight && d.teamRight.name || 'T TEAM';
    var style = d.bpStyle || 'mono';
    var colors = d.bpColors || { dark: '#292727', mid: '#6b4226', light: '#b26500' };
    var animEnabled = d.bpAnimEnabled === true;
    var cardsVisible = d.bpCardsVisible !== false;

    document.documentElement.style.setProperty('--bp-dark', colors.dark);
    document.documentElement.style.setProperty('--bp-mid', colors.mid || colors.dark);
    document.documentElement.style.setProperty('--bp-light', colors.light);

    var custom = d.bpCustomColors || {};
    document.documentElement.style.setProperty('--title-start', custom.titleStart || '#fff700');
    document.documentElement.style.setProperty('--title-end', custom.titleEnd || '#eb8100');
    document.documentElement.style.setProperty('--team-bar-start', custom.teamBarStart || '#0c2d63');
    document.documentElement.style.setProperty('--team-bar-end', custom.teamBarEnd || '#0a2249');
    document.documentElement.style.setProperty('--decider-tag', custom.deciderTag || '#ffc107');
    document.documentElement.style.setProperty('--decider-text', custom.deciderText || '#191919');
    document.documentElement.style.setProperty('--ban-tag', custom.banTag || '#dc2626');
    document.documentElement.style.setProperty('--ban-text', custom.banText || '#ffffff');
    document.documentElement.style.setProperty('--pick-tag', custom.pickTag || '#22c55e');
    document.documentElement.style.setProperty('--pick-text', custom.pickText || '#ffffff');

    var newKey = getSeqKey(bp);
    var hasSequence = bp.sequence && bp.sequence.length > 0;

    // Show 按钮触发：从 hidden 变为 visible
    var isShowTrigger = animEnabled && prevCardsVisible === false && cardsVisible === true;

    // 强制重建条件
    var needsRebuild = isFirstRender ||
                       isShowTrigger ||
                       newKey !== prevKey ||
                       style !== prevStyle;

    if (needsRebuild) {
      isFirstRender = false;
      prevKey = newKey;
      prevStyle = style;
      prevCardsVisible = cardsVisible;

      // Show 触发：立即显示 row（禁用 transition），然后卡片逐个入场
      if (isShowTrigger) {
        row.style.transition = 'none';
        row.classList.remove('hidden');
        requestAnimationFrame(function() {
          requestAnimationFrame(function() {
            row.style.transition = '';
          });
        });
      }

      row.innerHTML = '';

      if (hasSequence) {
        var cardsList = [];
        bp.sequence.forEach(function(item, index) {
          var playEnter = isShowTrigger || animEnabled;
          var card = createCard(item, style, leftName, rightName, index, bp.sequence.length, playEnter);
          row.appendChild(card);
          cardsList.push(card);
          var safeMap = item.map.replace(/[^a-zA-Z0-9]/g, '');
          var strokeEl = document.getElementById('stroke-' + safeMap);
          var fillEl = document.getElementById('fill-' + safeMap);
          if (strokeEl && fillEl) fitText(strokeEl, fillEl, 240);
        });
        // 逐个触发 transition 入场
        if ((isShowTrigger || animEnabled) && cardsList.length > 0) {
          cardsList.forEach(function(card, index) {
            setTimeout(function() {
              card.classList.remove('card-pending');
              card.classList.add('card-entering');
            }, index * 500);
          });
        }
      }
    }

    // 显示/隐藏控制
    if (!isShowTrigger) {
      if (animEnabled) {
        if (cardsVisible) {
          row.classList.remove('hidden');
        } else {
          row.classList.add('hidden');
        }
      } else {
        row.classList.remove('hidden');
      }
    }
    prevCardsVisible = cardsVisible;

    // 非重建时更新队名文字
    if (!needsRebuild && hasSequence) {
      bp.sequence.forEach(function(item) {
        var safeMap = item.map.replace(/[^a-zA-Z0-9]/g, '');
        var displayName = item.action === 'decider' ? 'Decider'
          : (item.team === 'left' ? leftName : rightName);
        var strokeEl = document.getElementById('stroke-' + safeMap);
        var fillEl = document.getElementById('fill-' + safeMap);
        if (strokeEl && fillEl) {
          strokeEl.textContent = displayName;
          fillEl.textContent = displayName;
          fitText(strokeEl, fillEl, 240);
        }
      });
    }
  }

  async function tick() {
    try {
      var r = await fetch('/api/state');
      var d = await r.json();
      render(d);
    } catch(e) {}
  }

  tick();
  setInterval(tick, 500);
</script>
</body>
</html>`;
}

function createWindow() {
  mainWindow = new BrowserWindow({
  width: 1360,
  height: 700,
  minWidth: 1000,
  minHeight: 600,
    frame: false,
    resizable:true,
    maximizable: true,
    autoHideMenuBar: true,
    title: 'Astra Director @말랑말랑',
    icon: path.join(__dirname, 'logo.ico'),
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    backgroundColor: '#0f0f0f',
  });

  mainWindow.on('maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-maximized', true);
    }
  });
  mainWindow.on('unmaximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-maximized', false);
    }
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }
  const defaultImages = ['ct_bg.png', 't_bg.png'];
  defaultImages.forEach(img => {
    const dest = path.join(PUBLIC_DIR, img);
    if (!fs.existsSync(dest)) {
      const possibleSources = [
        path.join(__dirname, '../public', img),
        path.join(__dirname, '../dist', img),
        path.join(process.resourcesPath, 'public', img)
      ];
      for (const src of possibleSources) {
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
          break;
        }
      }
    }
  });
  obsState.ctBgVisible = store.get('ctBgVisible', false);
  obsState.tBgVisible = store.get('tBgVisible', false);
  obsState.ctBgName = store.get('ctBgName', 'ct_bg.png');
  obsState.tBgName = store.get('tBgName', 't_bg.png');
  obsState.bgImgOpacity = store.get('bgImgOpacity', 0.3);
  const savedColors = store.get('colors');
  if (savedColors) obsState.colors = savedColors;
  const scoreDir = store.get('scoreTxtDir', path.join(app.getPath('documents'), 'Astra Director', 'scores'));
  if (!fs.existsSync(scoreDir)) fs.mkdirSync(scoreDir, { recursive: true });
  writeTeamNameTxt();
  createWindow();
  startGsiServer();
  startObsServer();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

const GSI_CFG_CONTENT = `"CS2 Scoreboard"
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
}`;

ipcMain.handle('auto-config-gsi', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Select the cs2 file ',
    properties: ['openDirectory'],
    message: 'Please select the file :...\\Counter Strike Global Offensive \\ game \\ csgo \\ cfg  '
  });

  if (canceled || !filePaths.length) {
    return { success: false, message: ' ' };
  }

  const cfgDir = filePaths[0];
  const cfgPath = path.join(cfgDir, 'gamestate_integration_astra_Director.cfg');

  if (fs.existsSync(cfgPath)) {
    return { success: false, message: 'Already exist', path: cfgPath };
  }

  const isLikelyCfgDir = fs.existsSync(path.join(cfgDir, '..', 'gameinfo.gi')) ||
                         fs.readdirSync(cfgDir).some(f => f.endsWith('.cfg'));

  try {
    fs.writeFileSync(cfgPath, GSI_CFG_CONTENT, 'utf8');
    return {
      success: true,
      message: 'GSI configuration DONE',
      path: cfgPath,
      warning: isLikelyCfgDir ? null : 'Wrong file.Please Check if the tile path is correct.'
    };
  } catch (err) {
    return { success: false, message: ' Fail: ' + err.message };
  }
});

ipcMain.handle('toggle-score-txt', (event, enabled) => {
  store.set('scoreTxtEnabled', enabled);
  return true;
});

ipcMain.handle('get-score-txt-enabled', () => {
  return store.get('scoreTxtEnabled', false);
});

ipcMain.handle('select-score-dir', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Select folder for score.txt output',
    properties: ['openDirectory'],
    defaultPath: store.get('scoreTxtDir', path.join(app.getPath('userData'), 'scores'))
  });

  if (canceled || !filePaths.length) return { success: false };

  const newDir = filePaths[0];
  store.set('scoreTxtDir', newDir);
  return { success: true, path: newDir };
});

ipcMain.handle('get-score-dir', () => {
  return store.get('scoreTxtDir', path.join(app.getPath('userData'), 'scores'));
});

ipcMain.handle('update-obs-state', (_, newState) => {
  const oldLeftScore = obsState.teamLeft.score;
  const oldRightScore = obsState.teamRight.score;
  const oldLeftMapScore = obsState.teamLeft.mapScore;
  const oldRightMapScore = obsState.teamRight.mapScore;

  const oldLeftName = obsState.teamLeft.name;
  const oldRightName = obsState.teamRight.name;
  if (newState.bp) obsState.bp = newState.bp;
  if (newState.teamLeft?.name !== undefined) 
    obsState.teamLeft.name = newState.teamLeft.name;
  if (newState.teamRight?.name !== undefined) 
    obsState.teamRight.name = newState.teamRight.name;
  if (newState.bpStyle) obsState.bpStyle = newState.bpStyle;
  if (newState.bpColors) obsState.bpColors = newState.bpColors;
  if (newState.bpCustomColors) obsState.bpCustomColors = { ...obsState.bpCustomColors, ...newState.bpCustomColors };
  if (typeof newState.teamLeft?.score === 'number') obsState.teamLeft.score = newState.teamLeft.score;
  if (typeof newState.teamRight?.score === 'number') obsState.teamRight.score = newState.teamRight.score;
  if (typeof newState.teamLeft?.mapScore === 'number') obsState.teamLeft.mapScore = newState.teamLeft.mapScore;
  if (typeof newState.teamRight?.mapScore === 'number') obsState.teamRight.mapScore = newState.teamRight.mapScore;
  if (newState.teamLeft?.players) obsState.teamLeft.players = newState.teamLeft.players;
  if (newState.teamRight?.players) obsState.teamRight.players = newState.teamRight.players;
  if (newState.format) obsState.format = newState.format;
  if (typeof newState.currentMap === 'number') obsState.currentMap = newState.currentMap;
  if (typeof newState.matchOver === 'boolean') obsState.matchOver = newState.matchOver;
  if (newState.winner !== undefined) obsState.winner = newState.winner;
  if (typeof newState.bpAnimEnabled === 'boolean') obsState.bpAnimEnabled = newState.bpAnimEnabled;
  if (typeof newState.bpCardsVisible === 'boolean') obsState.bpCardsVisible = newState.bpCardsVisible;
  if (typeof newState.gsiConnected === 'boolean') obsState.gsiConnected = newState.gsiConnected;
  if (newState.mvp !== undefined) obsState.mvp = newState.mvp;
  if (typeof newState.showMvp === 'boolean') obsState.showMvp = newState.showMvp;
  if (typeof newState.bgOpacity === 'number') obsState.bgOpacity = newState.bgOpacity;
  if (typeof newState.bgImgOpacity === 'number') {
    obsState.bgImgOpacity = newState.bgImgOpacity;
    store.set('bgImgOpacity', newState.bgImgOpacity);
  }

  const isReset = newState.teamLeft?.score === 0 && newState.teamRight?.score === 0 &&
                  newState.teamLeft?.mapScore === 0 && newState.teamRight?.mapScore === 0 &&
                  (oldLeftScore > 0 || oldRightScore > 0 || oldLeftMapScore > 0 || oldRightMapScore > 0);

  if (isReset) {
    resetAdrTracker();
    obsState.teamLeft.name = 'CT TEAM';
    obsState.teamRight.name = 'T TEAM';
    obsState.showMvp = false;
    obsState.mvp = null;
    store.set('showMvp', false);
    store.delete('mvp');
  }

  writeScoreTxt();
  if (obsState.teamLeft.name !== oldLeftName || obsState.teamRight.name !== oldRightName) {
    writeTeamNameTxt();
  }
  return true;
});

ipcMain.handle('select-bg-image', async (event, team) => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }]
  });

  if (canceled || !filePaths.length) return { success: false };

  const src = filePaths[0];
  const destName = path.basename(src);
  const dest = path.join(PUBLIC_DIR, destName);

  if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  fs.copyFileSync(src, dest);

  store.set(`${team}BgName`, destName);
  if (team === 'ct') obsState.ctBgName = destName;
  else obsState.tBgName = destName;

  return { success: true, fileName: destName };
});

ipcMain.handle('toggle-bg-visible', (event, team, visible) => {
  store.set(`${team}BgVisible`, visible);
  if (team === 'ct') obsState.ctBgVisible = visible;
  else obsState.tBgVisible = visible;
  return true;
});

ipcMain.handle('update-team-color', (event, team, colorData) => {
  if (!obsState.colors) obsState.colors = { ct: {}, t: {} };
  obsState.colors[team] = { ...obsState.colors[team], ...colorData };
  store.set('colors', obsState.colors);
  return true;
});

ipcMain.handle('get-team-colors', () => {
  return obsState.colors || {};
});

ipcMain.handle('get-bg-config', () => {
  return {
    ctBgVisible: store.get('ctBgVisible', false),
    tBgVisible: store.get('tBgVisible', false),
    ctBgName: store.get('ctBgName', 'ct_bg.png'),
    tBgName: store.get('tBgName', 't_bg.png'),
    bgOpacity: obsState.bgOpacity,
    bgImgOpacity: obsState.bgImgOpacity
  };
});

ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('minimize-window', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.handle('maximize-window', () => {
  if (mainWindow) mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.handle('close-window', () => { if (mainWindow) mainWindow.close(); });
