import { useAppStore } from '@/store/appStore';
import Scoreboard from '@/components/Scoreboard';
import PlayerTable from '@/components/PlayerTable';
import SheenButton from '@/components/SheenButton';
import MatchConfig from '@/components/MatchConfig';
import { motion } from 'framer-motion';
import { ArrowLeftRight, RotateCcw, Plus, Minus } from 'lucide-react';

export default function Dashboard() {
  const addScore = useAppStore(s => s.addScore);
  const subScore = useAppStore(s => s.subScore);
  const swapScores = useAppStore(s => s.swapScores);
  const resetMatch = useAppStore(s => s.resetMatch);
  const match = useAppStore(s => s.match);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col gap-6 overflow-y-auto scrollbar-thin pr-1"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Scoreboard</h1>
          <p className="text-xs text-[#00F0FF] font-display mt-1 tracking-wider">
            URL: http://127.0.0.1:8080/
          </p>
        </div>
        <MatchConfig />
      </div>

      {/* Scoreboard */}
      <div className="liquid-glass rounded-2xl p-6 sm:p-8">
        <Scoreboard />
      </div>

      {/* Player Tables + Quick Actions */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_1fr_240px] gap-5 min-h-0">
        {/* CT Table */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="min-h-0 flex flex-col"
        >
          <PlayerTable team="CT" />
        </motion.div>

        {/* T Table */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="min-h-0 flex flex-col"
        >
          <PlayerTable team="T" />
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="liquid-glass rounded-2xl p-5 flex flex-col gap-3"
        >
          <h3 className="text-sm font-bold text-[#94A3B8] uppercase tracking-widest mb-1">
            Score Edit
          </h3>

          <SheenButton
            variant="primary"
            size="md"
            className="w-full"
            onClick={() => addScore('left')}
            disabled={match.matchOver}
          >
            <Plus className="w-4 h-4" />
            Left team +1
          </SheenButton>

          <SheenButton
            variant="danger"
            size="md"
            className="w-full"
            onClick={() => addScore('right')}
            disabled={match.matchOver}
          >
            <Plus className="w-4 h-4" />
            Right team +1
          </SheenButton>

          <div className="h-px bg-white/5 my-1" />

          <SheenButton
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => subScore('left')}
          >
            <Minus className="w-3.5 h-3.5" />
            Left team -1
          </SheenButton>

          <SheenButton
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => subScore('right')}
          >
            <Minus className="w-3.5 h-3.5" />
            Right team -1
          </SheenButton>

          <div className="h-px bg-white/5 my-1" />

          <SheenButton
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={swapScores}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            Switch Big Score
          </SheenButton>

          <SheenButton
            variant="ghost"
            size="sm"
            className="w-full text-[#FF3D00] border-[#FF3D00]/20 hover:border-[#FF3D00]/40 hover:bg-[#FF3D00]/5"
            onClick={resetMatch}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </SheenButton>
        </motion.div>
      </div>
    </motion.div>
  );
}
