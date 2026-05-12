export interface Player {
  steamid: string;
  name: string;
  team: 'CT' | 'T';
  kills: number;
  deaths: number;
  assists: number;
  kd: number;
  adr?: number;
}
export interface TeamState {
  name: string;
  score: number;
  mapScore: number;
  players: Player[];
}

export interface MatchState {
  format: 'BO1' | 'BO3' | 'BO5';
  teamLeft: TeamState;
  teamRight: TeamState;
  currentMap: number;
  matchOver: boolean;
  winner: string | null;
}

export interface HotkeyConfig {
  leftAdd: string;
  rightAdd: string;
  leftSub: string;
  rightSub: string;
  swap: string;
  reset: string;
} 

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export type PageName = 'dashboard' | 'datapanel' | 'hotkeys' | 'logs';
