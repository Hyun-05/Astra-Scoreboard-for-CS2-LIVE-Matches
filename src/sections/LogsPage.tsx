import { useRef, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { motion } from 'framer-motion';
import { ScrollText, Trash2 } from 'lucide-react';

const logColors: Record<string, string> = {
  info: '#94A3B8',
  success: '#00F0FF',
  warning: '#FF9100',
  error: '#FF3D00',
};

const logBgColors: Record<string, string> = {
  info: 'transparent',
  success: 'rgba(0, 240, 255, 0.03)',
  warning: 'rgba(255, 145, 0, 0.03)',
  error: 'rgba(255, 61, 0, 0.03)',
};

export default function LogsPage() {
  const logs = useAppStore(s => s.logs);
  const addLog = useAppStore(s => s.addLog);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs]);

  const handleClear = () => {
    useAppStore.setState({ logs: [] });
    addLog('Log Cleared', 'info');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col gap-5 overflow-hidden"
    >
      <div className="flex items-center justify-between flex-shrink-0">
        <h1 className="text-2xl font-bold text-white tracking-wide">System Logs</h1>
        <button
          onClick={handleClear}
          className="flex items-center gap-2 px-4 py-2 rounded-lg liquid-glass text-sm text-[#94A3B8] hover:text-[#FF3D00] transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Clear Logs
        </button>
      </div>

      <div className="liquid-glass rounded-2xl flex-1 min-h-0 overflow-hidden flex flex-col">
        {/* Log Header */}
        <div className="px-5 py-3 flex items-center gap-3 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <ScrollText className="w-4 h-4 text-[#64748B]" />
          <span className="text-xs font-bold text-[#64748B] uppercase tracking-widest">
            Live Log
          </span>
          <span className="text-[10px] text-[#475569] ml-auto">
            {logs.length} records
          </span>
        </div>

        {/* Log Entries */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-2">
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[#475569] text-sm">
              No log records 
            </div>
          ) : (
            <div className="space-y-0.5">
              {logs.map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(index * 0.01, 0.3) }}
                  className="flex items-start gap-3 px-3 py-1.5 rounded-lg font-mono-data text-xs leading-relaxed"
                  style={{
                    color: logColors[log.type] || '#94A3B8',
                    background: logBgColors[log.type] || 'transparent',
                  }}
                >
                  <span className="text-[#475569] flex-shrink-0 w-[60px]">
                    {log.timestamp}
                  </span>
                  <span className="break-all">{log.message}</span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
