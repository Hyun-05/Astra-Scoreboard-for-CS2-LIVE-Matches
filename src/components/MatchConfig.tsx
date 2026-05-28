import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Check, Undo2 ,Copy } from 'lucide-react';   // ← 新增 Undo2

export default function MatchConfig() {
  const [isOpen, setIsOpen] = useState(false);
  const match = useAppStore(s => s.match);
  const setFormat = useAppStore(s => s.setFormat);
  const setTeamName = useAppStore(s => s.setTeamName);
  const [copied, setCopied] = useState<string | null>(null);   // ← 新增复制状态
  const [obsPort, setObsPort] = useState(8080);

  useEffect(() => {
    const api = (window as any).electronAPI;
    api?.getObsPort?.().then((port: number) => setObsPort(port)).catch(() => {});
  }, []);
  const resetTeamNames = useAppStore(s => s.resetTeamNames);   // ← 新增

  const [leftName, setLeftName] = useState(match.teamLeft.name);
  const [rightName, setRightName] = useState(match.teamRight.name);

  const handleApply = () => {
    setTeamName('left', leftName);
    setTeamName('right', rightName);
    useAppStore.getState().addToast('Name updated', 'success');
  };
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleReset = () => {
    resetTeamNames();
    setLeftName('CT TEAM');
    setRightName('T TEAM');
  };
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg liquid-glass text-sm text-[#94A3B8] hover:text-white transition-colors"
      >
        <Settings className="w-4 h-4" />
        <span className="hidden sm:inline">Match Settings</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full mt-2 w-80 liquid-glass-strong rounded-xl p-5 z-50"
              style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}
            >
              <h3 className="text-sm font-bold text-white mb-4">Match Settings</h3>

              {/* Format */}
              <div className="mb-4">
                <label className="text-xs text-[#94A3B8] mb-1.5 block">Format</label>
                <div className="flex gap-2">
                  {(['BO1', 'BO3', 'BO5'] as const).map(fmt => (
                    <button
                      key={fmt}
                      onClick={() => setFormat(fmt)}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold font-display transition-all ${
                        match.format === fmt
                          ? 'bg-gradient-to-r from-[#00F0FF] to-[#2979FF] text-black'
                          : 'bg-white/5 text-[#94A3B8] hover:bg-white/10'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Team Names */}
              <div className="space-y-3 mb-4">
                {/* Left Team */}
                <div>
                  <label className="text-xs text-[#94A3B8] mb-1.5 block">Left Team</label>
                  <input
                    type="text"
                    value={leftName}
                    onChange={e => setLeftName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-[#475569] focus:outline-none focus:border-[#00F0FF]/50 transition-colors"
                  />
                  <button
                    onClick={() => handleCopy(`http://127.0.0.1:${obsPort}/name1`, 'left')}
                    className="mt-1.5 flex items-center gap-1 text-[10px] text-[#00F0FF] hover:text-white transition-colors cursor-pointer"
                  >
                    {copied === 'left' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    URL: http://127.0.0.1:{obsPort}/name1
                  </button>
                </div>

                {/* Right Team */}
                <div>
                  <label className="text-xs text-[#94A3B8] mb-1.5 block">Right Team</label>
                  <input
                    type="text"
                    value={rightName}
                    onChange={e => setRightName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-[#475569] focus:outline-none focus:border-[#FF9100]/50 transition-colors"
                  />
                  <button
                    onClick={() => handleCopy(`http://127.0.0.1:${obsPort}/name2`, 'right')}
                    className="mt-1.5 flex items-center gap-1 text-[10px] text-[#FF9100] hover:text-white transition-colors cursor-pointer"
                  >
                    {copied === 'right' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    URL: http://127.0.0.1:{obsPort}/name2
                  </button>
                </div>
              </div>

              {/* Update Button */}
              <button
                onClick={handleApply}
                className="w-full py-2 rounded-lg bg-gradient-to-r from-[#00F0FF] to-[#2979FF] text-black text-sm font-bold flex items-center justify-center gap-2 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-shadow"
              >
                <Check className="w-4 h-4" />
                Update Teamname
              </button>

              {/* Reset Button */}
              <button
                onClick={handleReset}
                className="w-full mt-2 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-[#94A3B8] hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                <Undo2 className="w-4 h-4" />
                Reset to Default
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
