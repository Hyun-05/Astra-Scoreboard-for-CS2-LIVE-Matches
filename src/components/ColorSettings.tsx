import { useState, useEffect } from 'react';

export default function ColorSettings() {
  const [ctColor, setCtColor] = useState('#00F0FF');
  const [tColor, setTColor] = useState('#FF9100');

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api?.getTeamColors) return;
    api.getTeamColors().then((colors: any) => {
      if (colors?.ct?.primary) setCtColor(colors.ct.primary);
      if (colors?.t?.primary) setTColor(colors.t.primary);
    });
  }, []);

  const applyColor = (team: 'ct' | 't', hex: string) => {
    const api = (window as any).electronAPI;
    if (!api?.updateTeamColor) return;
    
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    api.updateTeamColor(team, {
      primary: hex,
      glow: `rgba(${r},${g},${b},1)`,
      bg: `rgba(${r},${g},${b},0.15)`,
      border: `rgba(${r},${g},${b},0.3)`,
      shadow: `rgba(${r},${g},${b},0.35)`,
      alpha: `rgba(${r},${g},${b},1)`
    });
  };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Team Color</h4>
      
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
          <input
            type="color"
            value={ctColor}
            onChange={(e) => {
              setCtColor(e.target.value);
              applyColor('ct', e.target.value);
            }}
            className="h-8 w-14 rounded cursor-pointer bg-transparent border border-slate-600"
          />
          CT Main color
        </label>
        <span className="text-xs text-slate-500 font-mono">{ctColor}</span>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
          <input
            type="color"
            value={tColor}
            onChange={(e) => {
              setTColor(e.target.value);
              applyColor('t', e.target.value);
            }}
            className="h-8 w-14 rounded cursor-pointer bg-transparent border border-slate-600"
          />
          T Main color
        </label>
        <span className="text-xs text-slate-500 font-mono">{tColor}</span>
      </div>
    </div>
  );
}