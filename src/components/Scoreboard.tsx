import { useAppStore } from '@/store/appStore';
import CountUp from 'react-countup';
import { motion } from 'framer-motion';
import { Shield, Flame } from 'lucide-react';

export default function Scoreboard() {
  const match = useAppStore(s => s.match);
  const needWins = { BO1: 1, BO3: 2, BO5: 3 }[match.format];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="w-full"
    >
      {/* Teams and Score */}
      <div className="flex items-center justify-center gap-6 sm:gap-10 md:gap-16">
        {/* Left Team */}
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Shield className="w-6 h-6 text-[#00F0FF] hidden sm:block" />
          <div className="text-right">
            <h2 className="text-xl sm:text-2xl md:text-4xl font-bold text-gradient-cyan font-display tracking-wide"
              style={{ textShadow: '0 0 30px rgba(0,240,255,0.2)' }}>
              {match.teamLeft.name}
            </h2>
          </div>
        </motion.div>

        {/* Score */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold font-display text-white tabular-nums"
              style={{
                textShadow: '0 4px 8px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(0,0,0,0.3)',
              }}>
              <CountUp
                key={`left-${match.teamLeft.score}`}
                end={match.teamLeft.score}
                duration={0.8}
                useEasing={true}
              />
            </span>
            <span className="text-3xl sm:text-4xl md:text-5xl font-display text-white/40 font-light">
              :
            </span>
            <span className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold font-display text-white tabular-nums"
              style={{
                textShadow: '0 4px 8px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(0,0,0,0.3)',
              }}>
              <CountUp
                key={`right-${match.teamRight.score}`}
                end={match.teamRight.score}
                duration={0.8}
                useEasing={true}
              />
            </span>
          </div>

          {/* Format indicator */}
          <p className="mt-2 text-xs sm:text-sm text-[#64748B] font-display tracking-wider">
            {match.matchOver
              ? `Match End / ${match.format}`
              : `Map ${match.currentMap}  / ${match.format}`}
          </p>
        </div>

        {/* Right Team */}
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="text-left">
            <h2 className="text-xl sm:text-2xl md:text-4xl font-bold text-gradient-orange font-display tracking-wide"
              style={{ textShadow: '0 0 30px rgba(255,61,0,0.2)' }}>
              {match.teamRight.name}
            </h2>
          </div>
          <Flame className="w-6 h-6 text-[#FF3D00] hidden sm:block" />
        </motion.div>
      </div>

      {/* Map Score */}
      <div className="flex justify-center mt-3">
        <div className="flex items-center gap-4 text-sm font-display">
          <span className="text-[#00F0FF]">{match.teamLeft.mapScore}</span>
          <span className="text-white/20">|</span>
          <span className="text-[#FF9100]">{match.teamRight.mapScore}</span>
        </div>
      </div>

      {/* Progress Dots */}
      <div className="flex justify-center mt-5 gap-2">
        {Array.from({ length: needWins }).map((_, i) => {
          const leftWon = i < match.teamLeft.score;
          const rightWon = i < match.teamRight.score;
          return (
            <div key={i} className="flex items-center gap-1">
              <motion.div
                className={`w-2.5 h-2.5 rounded-full ${leftWon ? 'bg-[#00F0FF]' : 'bg-white/10'}`}
                initial={false}
                animate={leftWon ? {
                  boxShadow: ['0 0 4px rgba(0,240,255,0.4)', '0 0 12px rgba(0,240,255,0.8)', '0 0 4px rgba(0,240,255,0.4)'],
                } : { boxShadow: 'none' }}
                transition={leftWon ? { duration: 1.5, repeat: Infinity } : {}}
              />
              <span className="text-[10px] text-white/20 font-display">vs</span>
              <motion.div
                className={`w-2.5 h-2.5 rounded-full ${rightWon ? 'bg-[#FF3D00]' : 'bg-white/10'}`}
                initial={false}
                animate={rightWon ? {
                  boxShadow: ['0 0 4px rgba(255,61,0,0.4)', '0 0 12px rgba(255,61,0,0.8)', '0 0 4px rgba(255,61,0,0.4)'],
                } : { boxShadow: 'none' }}
                transition={rightWon ? { duration: 1.5, repeat: Infinity } : {}}
              />
            </div>
          );
        })}
      </div>

      {/* Match Over Banner */}
      {match.matchOver && match.winner && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="flex justify-center mt-4"
        >
          <div className="px-8 py-2 rounded-full liquid-glass-strong"
            style={{
              border: '1px solid rgba(0, 240, 255, 0.3)',
              boxShadow: '0 0 30px rgba(0,240,255,0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}>
            <span className="text-lg font-bold text-gradient-cyan font-display tracking-wider">
              {match.winner} Win
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
