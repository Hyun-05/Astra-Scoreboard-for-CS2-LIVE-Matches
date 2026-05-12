import { useState, useCallback, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import type { HotkeyConfig } from '@/types';
import { motion } from 'framer-motion';
import { Keyboard, RotateCcw, AlertCircle } from 'lucide-react';

const actionLabels: Record<keyof HotkeyConfig, string> = {
  leftAdd: 'Left team +1',
  rightAdd: 'Right team +1',
  leftSub: 'Left team -1',
  rightSub: 'Right team -1',
  swap: 'Switch score',
  reset: 'Reset',
};

export default function HotkeysPage() {
  const hotkeys = useAppStore(s => s.hotkeys);
  const setHotkey = useAppStore(s => s.setHotkey);
  const addLog = useAppStore(s => s.addLog);
  const addToast = useAppStore(s => s.addToast);

  const [editing, setEditing] = useState<keyof HotkeyConfig | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!editing) return;

    if (e.key === 'Escape') {
      setEditing(null);
      addLog('Cancel Hotkey', 'info');
      return;
    }

    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key.toLowerCase();

    // Check conflicts
    for (const [action, existingKey] of Object.entries(hotkeys)) {
      if (existingKey === key && action !== editing) {
        addToast(`Error: '${key}'  ${actionLabels[action as keyof HotkeyConfig]} already used`, 'warning');
        return;
      }
    }

    const oldKey = hotkeys[editing];
    setHotkey(editing, key);
    addToast(`${actionLabels[editing]} Hotkey update: ${oldKey} -> ${key}`, 'success');
    setEditing(null);
  }, [editing, hotkeys, setHotkey, addLog, addToast]);

  useEffect(() => {
    if (editing) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [editing, handleKeyDown]);

  const handleReset = () => {
    const defaults: HotkeyConfig = {
      leftAdd: 'a',
      rightAdd: 'b',
      leftSub: 'c',
      rightSub: 'd',
      swap: 's',
      reset: 'r',
    };
    Object.entries(defaults).forEach(([action, key]) => {
      setHotkey(action as keyof HotkeyConfig, key);
    });
    addToast('Default set loaded', 'info');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full flex flex-col gap-5 overflow-y-auto scrollbar-thin pr-1"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white tracking-wide">HotkeySetting</h1>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 rounded-lg liquid-glass text-sm text-[#94A3B8] hover:text-white transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Restore default settings
        </button>
      </div>

      <div className="liquid-glass rounded-2xl p-5">
        <div className="space-y-3">
          {(Object.keys(actionLabels) as Array<keyof HotkeyConfig>).map((action, index) => {
            const isEditing = editing === action;
            return (
              <motion.div
                key={action}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className={`flex items-center justify-between px-5 py-3.5 rounded-xl transition-all ${
                  isEditing
                    ? 'bg-[#00F0FF]/10 border border-[#00F0FF]/30'
                    : 'bg-white/[0.02] border border-transparent hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-4">
                  <Keyboard className="w-4 h-4 text-[#64748B]" />
                  <span className="text-sm text-white font-medium">{actionLabels[action]}</span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="h-6 w-px bg-white/10" />

                  <div
                    className={`min-w-[40px] px-3 py-1.5 rounded-lg text-center font-mono-data text-sm font-bold transition-all ${
                      isEditing
                        ? 'bg-[#00F0FF]/20 text-[#00F0FF] animate-pulse'
                        : 'bg-white/5 text-[#00F0FF]'
                    }`}
                  >
                    {isEditing ? '...' : hotkeys[action].toUpperCase()}
                  </div>

                  <button
                    onClick={() => {
                      if (isEditing) {
                        setEditing(null);
                      } else {
                        setEditing(action);
                        addLog(`Waiting: Enter a key to bind${actionLabels[action]}  (Press ESC to cancel)`, 'info');
                      }
                    }}
                    className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isEditing
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        : 'bg-white/5 text-[#94A3B8] hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {isEditing ? 'Cancel' : 'Edit'}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-5 flex items-center gap-2 text-xs text-[#64748B]">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Click"Edit"and Press a key to bind,Press ESC to cancel。Hotkeys remain valid during software operation。</span>
        </div>
      </div>
    </motion.div>
  );
}
