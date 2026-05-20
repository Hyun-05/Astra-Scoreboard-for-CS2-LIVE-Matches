import { create } from 'zustand';
import type { MatchState, HotkeyConfig, LogEntry, Toast, PageName, Player } from '@/types';

interface AppState {
  currentPage: PageName;
  setPage: (page: PageName) => void;

  match: MatchState;
  setFormat: (format: 'BO1' | 'BO3' | 'BO5') => void;
  setTeamName: (side: 'left' | 'right', name: string) => void;
  addScore: (side: 'left' | 'right') => void;
  subScore: (side: 'left' | 'right') => void;
  swapScores: () => void;
  swapTeamNames: () => void;
  resetTeamNames: () => void;
  resetMatch: () => void;
  setMapScore: (side: 'left' | 'right', score: number) => void;
  mvp: { name: string; steamid: string; team: 'CT' | 'T'; kd: number } | null;
  hotkeys: HotkeyConfig;
  setHotkey: (action: keyof HotkeyConfig, key: string) => void;

  logs: LogEntry[];
  addLog: (message: string, type?: LogEntry['type']) => void;

  toasts: Toast[];
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;

  hotkeysEnabled: boolean;
  setHotkeysEnabled: (enabled: boolean) => void;
  bgOpacity: number;
  setBgOpacity: (opacity: number) => void;
  bgImgOpacity: number;
  setBgImgOpacity: (opacity: number) => void;
  syncBgConfig: () => Promise<void>;
  showMvp: boolean;
  setShowMvp: (show: boolean) => void;
  gsiConnected: boolean;
  setGsiConnected: (connected: boolean) => void;

  updatePlayers: (players: Player[]) => void;
}

const defaultMatch: MatchState = {
  format: 'BO3',
  teamLeft: {
    name: 'CT TEAM',
    score: 0,
    mapScore: 13,
    players: [],
  },
  teamRight: {
    name: 'T TEAM',
    score: 0,
    mapScore: 11,
    players: [],
  },
  currentMap: 1,
  matchOver: false,
  winner: null,
};

const defaultHotkeys: HotkeyConfig = {
  leftAdd: 'a',
  rightAdd: 'b',
  leftSub: 'c',
  rightSub: 'd',
  swap: 's',
  reset: 'r',
};

const generateSamplePlayers = (team: 'CT' | 'T'): Player[] => {
  const names = team === 'CT'
    ? ['Hyun-05', 's1mple', 'ZywOo', 'NiKo', 'm0NESY']
    : ['dev1ce', 'ropz', 'spinx', 'Jimpphat', 'siuhy'];
  return names.map((name, i) => ({
    steamid: `${team}_${i}`,
    name,
    team,
    kills: Math.floor(Math.random() * 25) + 5,
    deaths: Math.floor(Math.random() * 18) + 3,
    assists: Math.floor(Math.random() * 10),
    kd: 0,
    adr: Math.floor(Math.random() * 70) + 60,
  })).map(p => ({ ...p, kd: Math.floor((p.kills / Math.max(p.deaths, 1)) * 100) / 100 })) 
};

export const useAppStore = create<AppState>((set, get) => ({
  currentPage: 'dashboard',
  setPage: (page) => set({ currentPage: page }),

  match: {
    ...defaultMatch,
    teamLeft: { ...defaultMatch.teamLeft, players: generateSamplePlayers('CT') },
    teamRight: { ...defaultMatch.teamRight, players: generateSamplePlayers('T') },
  },

  setFormat: (format) => {
    set(state => ({
      match: { ...state.match, format, matchOver: false, winner: null },
    }));
    get().addLog(`channged into ${format}`, 'info');
  },

  setTeamName: (side, name) => {
    set(state => ({
      match: {
        ...state.match,
        [side === 'left' ? 'teamLeft' : 'teamRight']: {
          ...state.match[side === 'left' ? 'teamLeft' : 'teamRight'],
          name,
        },
      },
    }));
    const newMatch = get().match;
    (window as any).electronAPI?.updateObsState?.({
      teamLeft: { name: newMatch.teamLeft.name },
      teamRight: { name: newMatch.teamRight.name },
    });
    
  },

  addScore: (side) => {
    const state = get();
    if (state.match.matchOver) return;

    const needWins = { BO1: 1, BO3: 2, BO5: 3 }[state.match.format];
    const isLeft = side === 'left';

    set(s => {
      const newScore = isLeft ? s.match.teamLeft.score + 1 : s.match.teamRight.score + 1;
      const otherScore = isLeft ? s.match.teamRight.score : s.match.teamLeft.score;
      const matchOver = newScore >= needWins;
      const winner = matchOver ? (isLeft ? s.match.teamLeft.name : s.match.teamRight.name) : null;

      return {
        match: {
          ...s.match,
          [isLeft ? 'teamLeft' : 'teamRight']: {
            ...s.match[isLeft ? 'teamLeft' : 'teamRight'],
            score: newScore,
          },
          matchOver,
          winner,
          currentMap: Math.min(newScore + otherScore + 1, needWins * 2 - 1),
        },
      };
    });

    const teamName = isLeft ? state.match.teamLeft.name : state.match.teamRight.name;
    get().addToast(`${teamName} +1`, 'success');
    get().addLog(`${teamName} win Map ${state.match.currentMap} `, 'success');

        const newMatch = get().match;
    (window as any).electronAPI?.updateObsState?.({
      teamLeft: { score: newMatch.teamLeft.score },
      teamRight: { score: newMatch.teamRight.score },
      matchOver: newMatch.matchOver,
      winner: newMatch.winner,
      currentMap: newMatch.currentMap,
    });
  },

  
  subScore: (side) => {
    const isLeft = side === 'left';
    set(s => ({
      match: {
        ...s.match,
        matchOver: false,
        winner: null,
        [isLeft ? 'teamLeft' : 'teamRight']: {
          ...s.match[isLeft ? 'teamLeft' : 'teamRight'],
          score: Math.max(0, s.match[isLeft ? 'teamLeft' : 'teamRight'].score - 1),
        },
      },
    }));
    get().addLog(`${isLeft ? 'Left team' : 'Right team'}Score -1`, 'warning');

    const newMatch = get().match;
    (window as any).electronAPI?.updateObsState?.({
      teamLeft: { score: newMatch.teamLeft.score },
      teamRight: { score: newMatch.teamRight.score },
      matchOver: newMatch.matchOver,
      winner: newMatch.winner,
          });
  },

  swapScores: () => {
    set(s => {
      const leftScore = s.match.teamLeft.score;
      const rightScore = s.match.teamRight.score;
      return {
        match: {
          ...s.match,
          teamLeft: { ...s.match.teamLeft, score: rightScore },
          teamRight: { ...s.match.teamRight, score: leftScore },
        },
      };
    });

    const newMatch = get().match;
    (window as any).electronAPI?.updateObsState?.({
      teamLeft: { score: newMatch.teamLeft.score },
      teamRight: { score: newMatch.teamRight.score },
    });

    get().addToast('Series score swapped', 'info');
    get().addLog('Series score swapped', 'info');
  },

  swapTeamNames: () => {
    set(s => {
      const leftName = s.match.teamLeft.name;
      const rightName = s.match.teamRight.name;
      return {
        match: {
          ...s.match,
          teamLeft: { ...s.match.teamLeft, name: rightName },
          teamRight: { ...s.match.teamRight, name: leftName },
        },
      };
    });

    const newMatch = get().match;
    (window as any).electronAPI?.updateObsState?.({
      teamLeft: { name: newMatch.teamLeft.name },
      teamRight: { name: newMatch.teamRight.name },
    });

    get().addToast('Team names swapped', 'info');
    get().addLog('Team names swapped', 'info');
  },

  resetTeamNames: () => {
    set(s => ({
      match: {
        ...s.match,
        teamLeft: { ...s.match.teamLeft, name: 'CT TEAM' },
        teamRight: { ...s.match.teamRight, name: 'T TEAM' },
      },
    }));

    const newMatch = get().match;
    (window as any).electronAPI?.updateObsState?.({
      teamLeft: { name: newMatch.teamLeft.name },
      teamRight: { name: newMatch.teamRight.name },
    });

    get().addToast('Team names reset to default', 'info');
    get().addLog('Team names reset to default', 'info');
  },

  resetMatch: () => {
    set(s => ({
      showMvp: false,
      match: {
        ...defaultMatch,
        teamLeft: { ...defaultMatch.teamLeft, name: s.match.teamLeft.name },
        teamRight: { ...defaultMatch.teamRight, name: s.match.teamRight.name },
        format: s.match.format,
      },
    }));
    get().addToast('—— Match reset ——', 'warning');
    get().addLog('—— Match reset ——', 'warning');

    const newMatch = get().match;
    (window as any).electronAPI?.updateObsState?.({
      teamLeft: { score: newMatch.teamLeft.score, mapScore: newMatch.teamLeft.mapScore },
      teamRight: { score: newMatch.teamRight.score, mapScore: newMatch.teamRight.mapScore },
      matchOver: newMatch.matchOver,
      winner: newMatch.winner,
      currentMap: newMatch.currentMap,
    });
  },

  setMapScore: (side, score) => {
    const isLeft = side === 'left';
    set(s => ({
      match: {
        ...s.match,
        [isLeft ? 'teamLeft' : 'teamRight']: {
          ...s.match[isLeft ? 'teamLeft' : 'teamRight'],
          mapScore: score,
        },
      },
    }));
    const newMatch = get().match;
    (window as any).electronAPI?.updateObsState?.({
      teamLeft: { mapScore: newMatch.teamLeft.mapScore },
      teamRight: { mapScore: newMatch.teamRight.mapScore },
    });
  },

  hotkeys: { ...defaultHotkeys },
  setHotkey: (action, key) => {
    set(s => ({
      hotkeys: { ...s.hotkeys, [action]: key },
    }));
    get().addLog(`Hotkey update: ${action} -> ${key}`, 'info');
  },

  logs: [
    { id: '0', timestamp: '--:--:--', message: 'Waiting for GSI', type: 'info' },
  ],
  addLog: (message, type = 'info') => {
    const now = new Date();
    const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    set(s => ({
      logs: [{ id: `${Date.now()}`, timestamp, message, type }, ...s.logs].slice(0, 500),
    }));
  },

  toasts: [],
  addToast: (message, type = 'info') => {
    const id = `toast_${Date.now()}`;
    set(s => ({
      toasts: [...s.toasts, { id, message, type }],
    }));
    setTimeout(() => {
      get().removeToast(id);
    }, 3000);
  },
  removeToast: (id) => {
    set(s => ({
      toasts: s.toasts.filter(t => t.id !== id),
    }));
  },

  bgOpacity: 0.88,
  bgImgOpacity: 0.3,
  setBgOpacity: (opacity) => {
    set({ bgOpacity: opacity });
    (window as any).electronAPI?.updateObsState?.({ bgOpacity: opacity });
  },
  setBgImgOpacity: (opacity) => {
    set({ bgImgOpacity: opacity });
    (window as any).electronAPI?.updateObsState?.({ bgImgOpacity: opacity });
  },
  syncBgConfig: async () => {
    const config = await (window as any).electronAPI?.getBgConfig?.();
    set({
      bgOpacity: config?.bgOpacity ?? 0.88,
      bgImgOpacity: config?.bgImgOpacity ?? 0.3,
    });
  },
  mvp: { 
    name: 'Hyun-05', 
    steamid: 'CT_0', 
    team: 'CT' as 'CT' | 'T', 
    kd: 1.70 
  },
  gsiConnected: false,
  showMvp: true,
  setShowMvp: (show) => set({ showMvp: show }),
  setGsiConnected: (connected) => set({ gsiConnected: connected }),

  updatePlayers: (players) => {
    // 1. 按 ADR 排序（显示用）
    const ctPlayers = players
      .filter(p => p.team === 'CT')
      .sort((a, b) => (b.adr || 0) - (a.adr || 0));
    const tPlayers = players
      .filter(p => p.team === 'T')
      .sort((a, b) => (b.adr || 0) - (a.adr || 0));

    // 2. 计算 MVP：胜利方中 ADR名次 + KD名次 最小者
    const state = get();
    const leftMapScore = state.match.teamLeft.mapScore;
    const rightMapScore = state.match.teamRight.mapScore;

    const findMvp = (teamPlayers: Player[]): Player | null => {
      if (teamPlayers.length === 0) return null;
      
      const byKd = [...teamPlayers].sort((a, b) => {
        const aKd = a.deaths ? a.kills / a.deaths : a.kills;
        const bKd = b.deaths ? b.kills / b.deaths : b.kills;
        return bKd - aKd;
      });
      
      const byAdr = [...teamPlayers].sort((a, b) => (b.adr || 0) - (a.adr || 0));
      
      let bestScore = Infinity;
      let best: Player | null = null;
      
      for (const p of teamPlayers) {
        const kdRank = byKd.findIndex(x => x.steamid === p.steamid) + 1;
        const adrRank = byAdr.findIndex(x => x.steamid === p.steamid) + 1;
        const sum = kdRank + adrRank;
        
        if (sum < bestScore) {
          bestScore = sum;
          best = p;
        }
      }
      
      return best;
    };

    let mvpPlayer: Player | null = null;
    if (leftMapScore > rightMapScore) {
      mvpPlayer = findMvp(ctPlayers);
    } else if (rightMapScore > leftMapScore) {
      mvpPlayer = findMvp(tPlayers);
    }

    // 在 set 外面构造 mvp 数据，避免 TS 闭包推断问题
    const mvpData = mvpPlayer
      ? {
          name: mvpPlayer.name,
          steamid: mvpPlayer.steamid,
          team: mvpPlayer.team as 'CT' | 'T',
          kd: mvpPlayer.deaths
            ? Math.floor((mvpPlayer.kills / mvpPlayer.deaths) * 100) / 100
            : mvpPlayer.kills,
        }
      : null;

    set(s => ({
      match: {
        ...s.match,
        teamLeft: { ...s.match.teamLeft, players: ctPlayers },
        teamRight: { ...s.match.teamRight, players: tPlayers },
      },
      mvp: mvpData,
    }));
  },

    hotkeysEnabled: localStorage.getItem('hotkeysEnabled') === 'true', // 默认 false
  setHotkeysEnabled: (enabled) => {
    localStorage.setItem('hotkeysEnabled', String(enabled));
    set({ hotkeysEnabled: enabled });
  },}));