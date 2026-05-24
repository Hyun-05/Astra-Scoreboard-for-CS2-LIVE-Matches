import { useState, useEffect } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (api?.onMaximizedChange) {
      api.onMaximizedChange((value: boolean) => setIsMaximized(value));
    }
    return () => {
      if (api?.removeMaximizedListener) api.removeMaximizedListener();
    };
  }, []);

  const handleMinimize = () => (window as any).electronAPI?.minimizeWindow?.();
  const handleMaximize = () => (window as any).electronAPI?.maximizeWindow?.();
  const handleClose = () => (window as any).electronAPI?.closeWindow?.();

  return (
    <div
      className="h-10 bg-[#0a0a0c]/90 backdrop-blur-md border-b border-white/5 flex items-center justify-between select-none"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      {/* 左侧：可拖动区域 */}
      <div className="flex items-center gap-2 px-4">
        <span className="text-sm font-semibold text-white/80 tracking-wide">Astra Director</span>
      </div>

      {/* 右侧：三个按钮（no-drag 确保可点击） */}
      <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={handleMinimize}
          className="w-12 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-12 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          {isMaximized ? (
            <Copy className="w-3.5 h-3.5" />   // 两个重叠方块 = 还原
          ) : (
            <Square className="w-3.5 h-3.5" /> // 单个方块 = 最大化
          )}
        </button>
        <button
          onClick={handleClose}
          className="w-12 h-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}