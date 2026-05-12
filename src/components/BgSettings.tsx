import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
export default function BgSettings() {
  const [ctVisible, setCtVisible] = useState(true);
  const [tVisible, setTVisible] = useState(true);
  const [ctFile, setCtFile] = useState('ct_bg.png');
  const [tFile, setTFile] = useState('t_bg.png');
  const bgImgOpacity = useAppStore(s => s.bgImgOpacity);
  const setBgImgOpacity = useAppStore(s => s.setBgImgOpacity);
  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.getBgConfig) return;
    api.getBgConfig().then((cfg: any) => {
      setCtVisible(cfg.ctBgVisible);
      setTVisible(cfg.tBgVisible);
      setCtFile(cfg.ctBgName);
      setTFile(cfg.tBgName);

    });
  }, []);
  const selectImage = async (team: 'ct' | 't') => {
    const api = (window as any).electronAPI;
    if (!api?.selectBgImage) return;
    const res = await api.selectBgImage(team);
    if (res.success) {
      if (team === 'ct') setCtFile(res.fileName);
      else setTFile(res.fileName);
    }
  };

  const toggleVisible = (team: 'ct' | 't', visible: boolean) => {
    const api = (window as any).electronAPI;
    if (!api?.toggleBgVisible) return;
    api.toggleBgVisible(team, visible);
    if (team === 'ct') setCtVisible(visible);
    else setTVisible(visible);
  };

  const updateBgOpacity = (val: number) => {
    setBgImgOpacity(val); // store 里会自动调 IPC 持久化
  };

  return (
    <div className="space-y-3">
      {/* CT */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer min-w-[180px]">
          <input
            type="checkbox"
            checked={ctVisible}
            onChange={(e) => toggleVisible('ct', e.target.checked)}
            className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-400 accent-cyan-400"
          />
          Show CT BgPicture
        </label>
        <button
          onClick={() => selectImage('ct')}
          className="px-3 py-1.5 rounded-md bg-slate-800 text-xs font-medium text-slate-200 hover:bg-slate-700 border border-slate-700 transition"
        >
          Select BG Picture
        </button>
        <span className="text-xs text-slate-500">{ctFile}</span>
      </div>

      {/* T */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer min-w-[180px]">
          <input
            type="checkbox"
            checked={tVisible}
            onChange={(e) => toggleVisible('t', e.target.checked)}
            className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-orange-400 accent-orange-400"
          />
          Show T BgPicture
        </label>
        <button
          onClick={() => selectImage('t')}
          className="px-3 py-1.5 rounded-md bg-slate-800 text-xs font-medium text-slate-200 hover:bg-slate-700 border border-slate-700 transition"
        >
          Select BG Picture
        </button>
        <span className="text-xs text-slate-500">{tFile}</span>
      </div>

      <div className="flex items-center gap-4 mt-3">
        <label className="text-sm text-slate-200">BG Opacity</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={bgImgOpacity}           // ← 从 store 读
          onChange={(e) => updateBgOpacity(parseFloat(e.target.value))}
          className="w-32 accent-cyan-400"
        />
        <span className="text-xs text-slate-500 w-10">{bgImgOpacity.toFixed(2)}</span>
      </div>
    </div>
  );
}