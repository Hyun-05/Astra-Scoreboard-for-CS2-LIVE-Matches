import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import Scoreboard from '@/components/Scoreboard';
import PlayerTable from '@/components/PlayerTable';
import SheenButton from '@/components/SheenButton';
import MatchConfig from '@/components/MatchConfig';
import { motion } from 'framer-motion';
import { ArrowLeftRight, RotateCcw, Plus, Minus, Type } from 'lucide-react';

export default function Dashboard() {
  const addScore = useAppStore(s => s.addScore);
  const subScore = useAppStore(s => s.subScore);
  const swapScores = useAppStore(s => s.swapScores);
  const swapTeamNames = useAppStore(s => s.swapTeamNames);
  const resetMatch = useAppStore(s => s.resetMatch);
  const match = useAppStore(s => s.match);

  const [obsPort, setObsPort] = useState(8080);

  useEffect(() => {
    const api = (window as any).electronAPI;
    api?.getObsPort?.().then((port: number) => setObsPort(port)).catch(() => {});
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col overflow-hidden p-6 lg:p-8"
    >
      {/* ========== 顶部：Header + 大比分（固定，不滚动）========== */}
      <div className="flex items-center justify-between shrink-0 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Scoreboard</h1>
          <p className="text-xs text-[#00F0FF] font-display mt-1 tracking-wider">
            URL: http://127.0.0.1:{obsPort}
          </p>
        </div>
        <MatchConfig />
      </div>

      <div className="liquid-glass rounded-2xl p-6 sm:p-8 shrink-0 mb-5">
        <Scoreboard />
      </div>

      {/* ========== 中间：数据表格（自适应高度，超出内部滚动）========== */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin pr-1">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <PlayerTable team="CT" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <PlayerTable team="T" />
          </motion.div>
        </div>
      </div>

      {/* ========== 底部：手动改分（固定，不滚动）========== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="liquid-glass rounded-2xl p-5 flex flex-col gap-3 shrink-0 mt-5"
      >
        {/* 第一行：加减分 */}
        <div className="flex items-center justify-center gap-3">
          <SheenButton
            variant="primary"
            size="md"
            onClick={() => addScore('left')}
            disabled={match.matchOver}
          >
            <Plus className="w-4 h-4" />
            Left +1
          </SheenButton>

          <SheenButton
            variant="danger"
            size="md"
            onClick={() => addScore('right')}
            disabled={match.matchOver}
          >
            <Plus className="w-4 h-4" />
            Right +1
          </SheenButton>

          <div className="w-px h-8 bg-white/10" />

          <SheenButton
            variant="ghost"
            size="md"
            onClick={() => subScore('left')}
          >
            <Minus className="w-4 h-4" />
            Left -1
          </SheenButton>

          <SheenButton
            variant="ghost"
            size="md"
            onClick={() => subScore('right')}
          >
            <Minus className="w-4 h-4" />
            Right -1
          </SheenButton>
        </div>

        {/* 第二行：交换 + Reset */}
        <div className="flex items-center justify-center gap-3">
          <SheenButton
            variant="ghost"
            size="md"
            onClick={swapScores}
          >
            <ArrowLeftRight className="w-4 h-4" />
            Swap Score
          </SheenButton>

          <SheenButton
            variant="ghost"
            size="md"
            onClick={swapTeamNames}
          >
            <Type className="w-4 h-4" />
            Swap Names
          </SheenButton>

          <div className="w-px h-8 bg-white/10" />

          <SheenButton
            variant="ghost"
            size="md"
            className="text-[#FF3D00] border-[#FF3D00]/20 hover:border-[#FF3D00]/40 hover:bg-[#FF3D00]/5"
            onClick={resetMatch}
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </SheenButton>
        </div>
      </motion.div>
    </motion.div>
  );
}