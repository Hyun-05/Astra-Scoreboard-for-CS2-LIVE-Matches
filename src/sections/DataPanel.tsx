import { useAppStore } from '@/store/appStore';
import OpacitySlider from '@/components/OpacitySlider';
import BgSettings from '@/components/BgSettings';   // ← 新增
import { motion } from 'framer-motion';
import { Copy, ExternalLink, CheckCircle, Trophy, Settings } from 'lucide-react';
import { useState } from 'react';
import CountUp from 'react-countup';
import { useEffect } from 'react';
import ColorSettings from '@/components/ColorSettings';
export default function DataPanel() {
  const match = useAppStore(s => s.match);
  const mvp = useAppStore(s => s.mvp);
  const showMvp = useAppStore(s => s.showMvp);
  const bgOpacity = useAppStore(s => s.bgOpacity);
  const setBgOpacity = useAppStore(s => s.setBgOpacity);
  const addLog = useAppStore(s => s.addLog);
  const [copied, setCopied] = useState(false);
  const syncBgConfig = useAppStore(s => s.syncBgConfig);
  const [obsPort, setObsPort] = useState(8080);

    useEffect(() => {
    const api = (window as any).electronAPI;
    api?.getObsPort?.().then((port: number) => setObsPort(port)).catch(() => {});
  }, []);
  // ========== 新增：GSI 自动配置状态 ==========
  const [gsiStatus, setGsiStatus] = useState('');

const overlayUrl = `http://127.0.0.1:${obsPort}`;
  const handleCopy = () => {
    navigator.clipboard.writeText(overlayUrl).catch(() => {});
    setCopied(true);
    addLog('OBS URL copied', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  // ========== 新增：GSI 自动配置 ==========
  const handleAutoConfigGsi = async () => {
    const api = (window as any).electronAPI;
    if (!api?.autoConfigGsi) {
      setGsiStatus('API Unready,Please check preload configuration');
      addLog('GSI auto-config failed: API not ready', 'warning');
      return;
    }

    setGsiStatus('Waiting...');
    const result = await api.autoConfigGsi();

    if (result.success) {
      setGsiStatus(`✅ Written \n📁 ${result.path}`);
      addLog('GSI config auto-deployed', 'success');
      if (result.warning) {
        setGsiStatus(prev => prev + `\n⚠️ ${result.warning}`);
      }
        } else if (result.message === 'Already exist') {   // ← 加这行
      setGsiStatus(`⚠️ Already exist\n📁 ${result.path}`);
      addLog('GSI config already exists, skipped', 'info');
    } else {
      setGsiStatus(`❌ ${result.message}`);
      addLog(`GSI auto-config failed: ${result.message}`, 'warning');
    }
  };

  const ctPlayers = [...match.teamLeft.players].sort((a, b) => (b.adr || 0) - (a.adr || 0));
  const tPlayers = [...match.teamRight.players].sort((a, b) => (b.adr || 0) - (a.adr || 0));

  const ctTopKd = ctPlayers.length ? Math.max(...ctPlayers.map(p => p.kd || 0)) : 0;
  const ctTopAdr = ctPlayers.length ? Math.max(...ctPlayers.map(p => p.adr || 0)) : 0;
  const tTopKd = tPlayers.length ? Math.max(...tPlayers.map(p => p.kd || 0)) : 0;
  const tTopAdr = tPlayers.length ? Math.max(...tPlayers.map(p => p.adr || 0)) : 0;
  const [scoreEnabled, setScoreEnabled] = useState(false);
  const [scoreDir, setScoreDir] = useState('');

  useEffect(() => {
    const api = (window as any).electronAPI;
    api?.getScoreTxtEnabled?.().then((v: boolean) => setScoreEnabled(v));
    api?.getScoreDir?.().then((dir: string) => setScoreDir(dir));
  }, []);

  const handleToggleScore = async () => {
    const api = (window as any).electronAPI;
    const newVal = !scoreEnabled;
    await api?.toggleScoreTxt?.(newVal);
    setScoreEnabled(newVal);
    addLog(newVal ? 'Score.txt export enabled' : 'Score.txt export disabled', 'info');
  };

  const handleChangeScoreDir = async () => {
    const api = (window as any).electronAPI;
    const result = await api?.selectScoreDir?.();
    if (result?.success) {
      setScoreDir(result.path);
      addLog(`Score output dir: ${result.path}`, 'success');
    }
  };

  const handleCopyScorePath = () => {
    if (!scoreDir) return;
    navigator.clipboard.writeText(scoreDir).catch(() => {});
    addLog('Output directory path copied', 'info');
  };

  useEffect(() => {
    syncBgConfig();
  }, [syncBgConfig]);
    // 新增：初始化时根据当前 Sample Data 自动计算 MVP
  useEffect(() => {
    const state = useAppStore.getState();
    if (!state.mvp && state.match.teamLeft.players.length > 0) {
      state.updatePlayers([
        ...state.match.teamLeft.players,
        ...state.match.teamRight.players,
      ]);
    }
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col gap-5 overflow-y-auto scrollbar-thin pr-1"
    >
      <h1 className="text-2xl font-bold text-white tracking-wide">Scoreboard</h1>

      {mvp && showMvp && (match.teamLeft.mapScore !== match.teamRight.mapScore) && (
        <div className="liquid-glass rounded-xl p-4 flex items-center gap-3" style={{
          background: 'rgba(255, 215, 0, 0.08)',
          border: '1px solid rgba(255, 215, 0, 0.25)',
        }}>
          <Trophy className="w-5 h-5 text-[#FFD700]" />
          <div>
            <span className="text-xs text-[#FFD700] font-bold uppercase tracking-wider">MVP</span>
            <p className="text-sm text-white font-semibold">
              {mvp.team} · {mvp.name} · K/D {mvp.kd}
            </p>
          </div>
        </div>
      )}

      {/* OBS URL */}
      <div className="liquid-glass rounded-2xl p-5">
        <h3 className="text-sm font-bold text-[#94A3B8] uppercase tracking-widest mb-3">
          OBS URL
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-black/30 border border-white/5">
            <ExternalLink className="w-4 h-4 text-[#64748B] flex-shrink-0" />
            <code className="text-sm font-mono-data text-[#00F0FF]">{overlayUrl}</code>
          </div>
          <button
            onClick={handleCopy}
            className="px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-[#94A3B8] hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
          >
            {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'copied' : 'copy'}
          </button>
        </div>
      </div>
      {/* Text File Export */}
      <div className="liquid-glass rounded-2xl p-5">
        <h3 className="text-sm font-bold text-[#94A3B8] uppercase tracking-widest mb-3">
          OBS Text Sources
        </h3>
        
        {/* 开关 */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-white">Enable text file export</span>
          <button
            onClick={handleToggleScore}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              scoreEnabled ? 'bg-[#00F0FF]' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                scoreEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* 路径设置 */}
        {scoreEnabled && (
          <div className="flex items-center gap-3">
            <code className="flex-1 text-xs font-mono-data text-[#64748B] bg-black/30 px-3 py-2 rounded-lg border border-white/5 truncate">
              {scoreDir || 'Loading...'}
            </code>
            <button
              onClick={handleCopyScorePath}
              disabled={!scoreDir}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-[#94A3B8] hover:text-white hover:bg-white/10 transition-all disabled:opacity-30"
            >
              Copy
            </button>
            <button
              onClick={handleChangeScoreDir}
              className="px-3 py-2 rounded-lg bg-[#00F0FF]/10 border border-[#00F0FF]/20 text-sm text-[#00F0FF] hover:bg-[#00F0FF]/20 transition-all"
            >
              Change
            </button>
          </div>
        )}
        
        <p className="text-xs text-[#64748B] mt-2">
          {scoreEnabled 
            ? 'Auto-saves score.txt, teamname1.txt, teamname2.txt for OBS text sources.' 
            : 'Turn on to export text files to a folder of your choice.'}
        </p>
      </div>

      {/* OBS 背景设置 */}
      <div className="liquid-glass rounded-2xl p-5">
        <h3 className="text-sm font-bold text-[#94A3B8] uppercase tracking-widest mb-4">
          OBS BG Set
        </h3>
        
        <div className="mb-4">
          <label className="text-xs text-[#64748B] mb-1.5 block">Black layer Opacity</label>
          <OpacitySlider value={bgOpacity} onChange={setBgOpacity} />
        </div>

        <div className="mt-4 pt-4 border-t border-white/5">
          <BgSettings />
        </div>
        <div className="mt-4 pt-4 border-t border-white/5">
          <ColorSettings />
        </div>
      </div>

      {/* ========== 新增：GSI 自动配置 ========== */}
      <div className="liquid-glass rounded-2xl p-5">
        <h3 className="text-sm font-bold text-[#94A3B8] uppercase tracking-widest mb-3">
          GSI Config
        </h3>
        <div className="flex flex-col gap-3">
          <button
            onClick={handleAutoConfigGsi}
            className="px-4 py-2.5 rounded-lg bg-[#00F0FF]/10 border border-[#00F0FF]/20 text-sm text-[#00F0FF] hover:bg-[#00F0FF]/20 transition-all flex items-center gap-2 w-fit"
          >
            <Settings className="w-4 h-4" />
            GSI auto-configuration
          </button>
          {gsiStatus && (
            <pre className="text-xs text-[#94A3B8] whitespace-pre-wrap break-all bg-black/20 rounded-lg p-3 border border-white/5">
              {gsiStatus}
            </pre>
          )}
          <p className="text-xs text-[#64748B]">
            Select the CS2 cfg flie（common file path:
            <code className="text-[#94A3B8] mx-1">...\game\csgo\cfg</code>
            ）then will automatically configure GSI.After that you need to RESTART CS2.
          </p>
        </div>
      </div>
      {/* Hotkeys Toggle */}
      <div className="liquid-glass rounded-2xl p-5">
        <h3 className="text-sm font-bold text-[#94A3B8] uppercase tracking-widest mb-3">
          Hotkeys
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-sm text-white">Enable Global Hotkeys</span>
          <button
            onClick={() => {
              const state = useAppStore.getState();
              const newVal = !state.hotkeysEnabled;
              state.setHotkeysEnabled(newVal);
              addLog(newVal ? 'Hotkeys enabled' : 'Hotkeys disabled', 'info');
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              useAppStore(s => s.hotkeysEnabled) ? 'bg-[#00F0FF]' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                useAppStore(s => s.hotkeysEnabled) ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <p className="text-xs text-[#64748B] mt-2">
          Disable this to prevent accidental score changes while typing
        </p>
      </div>
      {/* 实时数据预览 */}
      <div className="liquid-glass rounded-2xl p-5 flex-1 min-h-[240px] flex flex-col">
        <h3 className="text-sm font-bold text-[#94A3B8] uppercase tracking-widest mb-4">
          Data preview
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
          {/* CT Panel */}
          <div className="rounded-xl overflow-hidden flex flex-col" style={{
            background: 'rgba(20, 20, 24, 0.8)',
            border: '1px solid rgba(0, 240, 255, 0.15)',
          }}>
            <div className="px-4 py-2 flex items-center justify-between" style={{
              borderBottom: '1px solid rgba(0, 240, 255, 0.1)',
              background: 'rgba(0, 240, 255, 0.05)',
            }}>
              <span className="text-xs font-bold text-[#00F0FF]">{match.teamLeft.name}</span>
              <span className="font-display text-sm font-bold text-[#00F0FF]">{match.teamLeft.mapScore}</span>
            </div>
            <div className="overflow-y-auto flex-1 min-h-0 scrollbar-thin">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] text-[#64748B] uppercase tracking-wider">
                    <th className="text-left px-4 py-2">Player</th>
                    <th className="text-right px-4 py-2">
                      <svg className="w-3 h-3 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                        <circle cx="12" cy="12" r="9"/>
                        <line x1="12" y1="3" x2="12" y2="9"/>
                        <line x1="12" y1="15" x2="12" y2="21"/>
                        <line x1="3" y1="12" x2="9" y2="12"/>
                        <line x1="15" y1="12" x2="21" y2="12"/>
                      </svg>
                      K
                    </th>
                    <th className="text-right px-4 py-2">
                      <svg className="w-3 h-3 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 2C6.48 2 2 6.48 2 12c0 2.5 1.5 4.5 3.5 5.5.5.2 1 .3 1.5.3V20h10v-2.2c.5 0 1-.1 1.5-.3 2-1 3.5-3 3.5-5.5 0-5.52-4.48-10-10-10z"/>
                        <circle cx="9" cy="10" r="1.2" fill="currentColor" stroke="none"/>
                        <circle cx="15" cy="10" r="1.2" fill="currentColor" stroke="none"/>
                        <path d="M10 14s1.5 1 2 1 2-1 2-1"/>
                      </svg>
                      D
                    </th>
                    <th className="text-right px-4 py-2">
                      <svg className="w-3 h-3 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m11 17 2 2a2 2 0 0 0 2.83 0l4.5-4.5a2 2 0 0 0 0-2.83l-2.5-2.5a2 2 0 0 0-2.83 0l-1.5 1.5"/>
                        <path d="m11 17-1.5 1.5a2 2 0 0 1-2.83 0l-4.5-4.5a2 2 0 0 1 0-2.83l2.5-2.5a2 2 0 0 1 2.83 0l1.5 1.5"/>
                        <path d="M8 14l2.5-2.5"/>
                        <path d="M13.5 8.5L16 6"/>
                      </svg>
                      A
                    </th>
                    <th className="text-right px-4 py-2">K/D</th>
                    <th className="text-right px-4 py-2">ADR</th>
                  </tr>
                </thead>
                <tbody>
                  {ctPlayers.map(p => {
                    const isKdTop = (p.kd || 0) === ctTopKd && ctTopKd > 0;
                    const isAdrTop = (p.adr || 0) === ctTopAdr && ctTopAdr > 0;
                    return (
                      <tr key={p.steamid} className="text-sm hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-1.5 text-[#E2E8F0] truncate max-w-[100px]">{p.name}</td>
                        <td className="px-4 py-1.5 text-right font-mono-data text-[#00F0FF]">
                          <CountUp end={p.kills} duration={0.6} />
                        </td>
                        <td className="px-4 py-1.5 text-right font-mono-data text-[#64748B]">
                          <CountUp end={p.deaths} duration={0.6} />
                        </td>
                        <td className="px-4 py-1.5 text-right font-mono-data text-[#94A3B8]">
                          <CountUp end={p.assists} duration={0.6} />
                        </td>
                        <td className={`px-4 py-1.5 text-right font-mono-data ${isKdTop ? 'text-[#00F0FF] font-bold' : 'text-white'}`}>
                          {p.kd.toFixed(2)}
                        </td>
                        <td className={`px-4 py-1.5 text-right font-mono-data ${isAdrTop ? 'text-[#00F0FF] font-bold' : 'text-[#94A3B8]'}`}>
                          {p.adr || 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* T Panel */}
          <div className="rounded-xl overflow-hidden flex flex-col" style={{
            background: 'rgba(20, 20, 24, 0.8)',
            border: '1px solid rgba(255, 61, 0, 0.15)',
          }}>
            <div className="px-4 py-2 flex items-center justify-between" style={{
              borderBottom: '1px solid rgba(255, 61, 0, 0.1)',
              background: 'rgba(255, 61, 0, 0.05)',
            }}>
              <span className="text-xs font-bold text-[#FF9100]">{match.teamRight.name}</span>
              <span className="font-display text-sm font-bold text-[#FF9100]">{match.teamRight.mapScore}</span>
            </div>
            <div className="overflow-y-auto flex-1 min-h-0 scrollbar-thin">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] text-[#64748B] uppercase tracking-wider">
                    <th className="text-left px-4 py-2">Player</th>
                    <th className="text-right px-4 py-2">
                      <svg className="w-3 h-3 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                        <circle cx="12" cy="12" r="9"/>
                        <line x1="12" y1="3" x2="12" y2="9"/>
                        <line x1="12" y1="15" x2="12" y2="21"/>
                        <line x1="3" y1="12" x2="9" y2="12"/>
                        <line x1="15" y1="12" x2="21" y2="12"/>
                      </svg>
                      K
                    </th>
                    <th className="text-right px-4 py-2">
                      <svg className="w-3 h-3 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 2C6.48 2 2 6.48 2 12c0 2.5 1.5 4.5 3.5 5.5.5.2 1 .3 1.5.3V20h10v-2.2c.5 0 1-.1 1.5-.3 2-1 3.5-3 3.5-5.5 0-5.52-4.48-10-10-10z"/>
                        <circle cx="9" cy="10" r="1.2" fill="currentColor" stroke="none"/>
                        <circle cx="15" cy="10" r="1.2" fill="currentColor" stroke="none"/>
                        <path d="M10 14s1.5 1 2 1 2-1 2-1"/>
                      </svg>
                      D
                    </th>
                    <th className="text-right px-4 py-2">
                      <svg className="w-3 h-3 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m11 17 2 2a2 2 0 0 0 2.83 0l4.5-4.5a2 2 0 0 0 0-2.83l-2.5-2.5a2 2 0 0 0-2.83 0l-1.5 1.5"/>
                        <path d="m11 17-1.5 1.5a2 2 0 0 1-2.83 0l-4.5-4.5a2 2 0 0 1 0-2.83l2.5-2.5a2 2 0 0 1 2.83 0l1.5 1.5"/>
                        <path d="M8 14l2.5-2.5"/>
                        <path d="M13.5 8.5L16 6"/>
                      </svg>
                      A
                    </th>
                    <th className="text-right px-4 py-2">K/D</th>
                    <th className="text-right px-4 py-2">ADR</th>
                  </tr>
                </thead>
                <tbody>
                  {tPlayers.map(p => {
                    const isKdTop = (p.kd || 0) === tTopKd && tTopKd > 0;
                    const isAdrTop = (p.adr || 0) === tTopAdr && tTopAdr > 0;
                    return (
                      <tr key={p.steamid} className="text-sm hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-1.5 text-[#E2E8F0] truncate max-w-[100px]">{p.name}</td>
                        <td className="px-4 py-1.5 text-right font-mono-data text-[#FF9100]">
                          <CountUp end={p.kills} duration={0.6} />
                        </td>
                        <td className="px-4 py-1.5 text-right font-mono-data text-[#64748B]">
                          <CountUp end={p.deaths} duration={0.6} />
                        </td>
                        <td className="px-4 py-1.5 text-right font-mono-data text-[#94A3B8]">
                          <CountUp end={p.assists} duration={0.6} />
                        </td>
                        <td className={`px-4 py-1.5 text-right font-mono-data ${isKdTop ? 'text-[#FF9100] font-bold' : 'text-white'}`}>
                          {p.kd.toFixed(2)}
                        </td>
                        <td className={`px-4 py-1.5 text-right font-mono-data ${isAdrTop ? 'text-[#FF9100] font-bold' : 'text-[#94A3B8]'}`}>
                          {p.adr || 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}