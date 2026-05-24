import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/appStore';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import ToastNotification from '@/components/ToastNotification';
import Dashboard from '@/sections/Dashboard';
import DataPanel from '@/sections/DataPanel';
import HotkeysPage from '@/sections/HotkeysPage';
import LogsPage from '@/sections/LogsPage';
import TitleBar from '@/components/TitleBar';
const BASE_WIDTH = 1620;
const BASE_HEIGHT = 1040;
const MIN_SCALE = 0.7;

const pageComponents = {
  dashboard: Dashboard,
  datapanel: DataPanel,
  hotkeys: HotkeysPage,
  logs: LogsPage,
};

function Background() {
  return (
    <div className="fixed inset-0 z-0">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/images/astra-bg.jpg)' }}
      />
      <div className="absolute inset-0" style={{ background: 'rgba(3, 3, 5, 0.4)' }} />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
        }}
      />
    </div>
  );
}

export default function App() {
  const scaleRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentPage = useAppStore(s => s.currentPage);
  const PageComponent = pageComponents[currentPage];

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.onMapChanged) return;
    const handleMapChanged = (_event: any, mapNum: number) => {
      useAppStore.getState().setCurrentMap(mapNum);
    };
    api.onMapChanged(handleMapChanged);
    return () => { api.removeAllListeners('map-changed'); };
  }, []);

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.onGsiData) return;

    const handleGsiData = (_event: any, data: any) => {
      if (data.allplayers) {
        const players = Object.entries(data.allplayers).map(([steamid, p]: [string, any]) => ({
          steamid,
          name: p.name || 'Unknown',
          team: p.team || 'CT',
          kills: p.match_stats?.kills || 0,
          deaths: p.match_stats?.deaths || 0,
          assists: p.match_stats?.assists || 0,
          kd: p.match_stats?.deaths
            ? Math.floor((p.match_stats.kills / p.match_stats.deaths) * 100) / 100
            : p.match_stats?.kills || 0,
          adr: p.state?.adr || 0,
        }));
        useAppStore.getState().updatePlayers(players);
      }

      if (data.map) {
        const state = useAppStore.getState();
        const ctName = data.map.team_ct?.name?.trim();
        const tName = data.map.team_t?.name?.trim();
        if (ctName && ctName.toUpperCase() !== 'CT' && state.match.teamLeft.name === 'CT TEAM') {
          state.setTeamName('left', ctName);
        }
        if (tName && tName.toUpperCase() !== 'T' && state.match.teamRight.name === 'T TEAM') {
          state.setTeamName('right', tName);
        }

        if (data.map.team_ct?.score !== undefined) {
          state.setMapScore('left', data.map.team_ct.score);
        }
        if (data.map.team_t?.score !== undefined) {
          state.setMapScore('right', data.map.team_t.score);
        }
      }
    };

    api.onGsiData(handleGsiData);
    return () => { api.removeAllListeners('gsi-data'); };
  }, []);

  // ========== 核心修改：宽度驱动缩放，横向永远无黑边 ==========
  useEffect(() => {
    let rafId: number;
    const updateScale = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!scaleRef.current || !scrollRef.current) return;

        // 以宽度为基准计算缩放，保证横向永远填满窗口
        const scale = Math.max(window.innerWidth / BASE_WIDTH, MIN_SCALE);
        const scaledHeight = BASE_HEIGHT * scale;

        // 缩放层固定定位在滚动容器左上角
        scaleRef.current.style.width = `${BASE_WIDTH}px`;
        scaleRef.current.style.height = `${BASE_HEIGHT}px`;
        scaleRef.current.style.transform = `scale(${scale})`;
        scaleRef.current.style.transformOrigin = 'top left';
        scaleRef.current.style.position = 'absolute';
        scaleRef.current.style.left = '0';
        scaleRef.current.style.top = '0';

        // 关键：滚动容器的高度必须等于缩放后的实际高度，否则滚动条会失灵
        scrollRef.current.style.height = `${scaledHeight}px`;
      });
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => {
      window.removeEventListener('resize', updateScale);
      cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.onGsiStatus) return;
    let prevStatus = false;
    const handleStatus = (_event: any, status: boolean) => {
      const state = useAppStore.getState();
      if (!prevStatus && status) state.addLog('[GSI] connected', 'success');
      else if (prevStatus && !status) state.addLog('[GSI] lost', 'warning');
      state.setGsiConnected(status);
      prevStatus = status;
    };
    api.onGsiStatus(handleStatus);
    return () => { api.removeAllListeners('gsi-status'); };
  }, []);

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.onMapEnded) return;
    let lastAutoScoreTime = 0;
    const AUTO_SCORE_COOLDOWN = 10000;
    const handleMapEnded = () => {
      const state = useAppStore.getState();
      const leftMapScore = state.match.teamLeft.mapScore;
      const rightMapScore = state.match.teamRight.mapScore;
      const now = Date.now();
      if (!state.match.matchOver && leftMapScore !== rightMapScore && now - lastAutoScoreTime > AUTO_SCORE_COOLDOWN) {
        lastAutoScoreTime = now;
        if (leftMapScore > rightMapScore) {
          state.addScore('left');
          state.addLog(`[Auto] Map End,${state.match.teamLeft.name} WIN,Score +1`, 'success');
        } else {
          state.addScore('right');
          state.addLog(`[Auto] Map End,${state.match.teamRight.name} WIN,Score +1`, 'success');
        }
      } else if (!state.match.matchOver && leftMapScore === rightMapScore) {
        state.addLog('[Auto] Map End,Draw', 'warning');
      }
      state.setShowMvp(true);
    };
    api.onMapEnded(handleMapEnded);
    return () => { api.removeAllListeners('map-ended'); };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = useAppStore.getState();
      const { hotkeys } = state;
      const key = e.key.toLowerCase();

      if (!state.hotkeysEnabled) return;
      if (key === hotkeys.leftAdd) {
        e.preventDefault();
        state.addScore('left');
      } else if (key === hotkeys.rightAdd) {
        e.preventDefault();
        state.addScore('right');
      } else if (key === hotkeys.leftSub) {
        e.preventDefault();
        state.subScore('left');
      } else if (key === hotkeys.rightSub) {
        e.preventDefault();
        state.subScore('right');
      } else if (key === hotkeys.swap) {
        e.preventDefault();
        state.swapScores();
      } else if (key === hotkeys.reset) {
        e.preventDefault();
        state.resetMatch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.updateObsState) return;
    let pendingState: any = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = useAppStore.subscribe((state) => {
      pendingState = {
        teamLeft: {
          name: state.match.teamLeft.name,
          score: state.match.teamLeft.score,
          mapScore: state.match.teamLeft.mapScore,
          players: state.match.teamLeft.players,
        },
        teamRight: {
          name: state.match.teamRight.name,
          score: state.match.teamRight.score,
          mapScore: state.match.teamRight.mapScore,
          players: state.match.teamRight.players,
        },
        format: state.match.format,
        currentMap: state.match.currentMap,
        matchOver: state.match.matchOver,
        winner: state.match.winner,
        gsiConnected: state.gsiConnected,
        mvp: state.mvp,
        showMvp: state.showMvp,
        bgOpacity: state.bgOpacity,
      };
      if (!timer) {
        timer = setTimeout(() => {
          if (pendingState && api?.updateObsState) {
            api.updateObsState(pendingState);
          }
          pendingState = null;
          timer = null;
        }, 300);
      }
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);

return (
  <div className="relative w-screen h-screen overflow-hidden bg-[#030305] flex flex-col">
    <Background />

    {/* 自定义标题栏 */}
    <div className="relative z-50 shrink-0">
      <TitleBar />
    </div>

    {/* 内容主体：Sidebar + Main */}
    <div className="flex flex-1 overflow-hidden relative z-10">
      <div className="w-[220px] h-full shrink-0">
        <Sidebar />
      </div>

      <main className="flex-1 h-full flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="h-full"
            >
              <PageComponent />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>

    <ToastNotification />
  </div>
);
}