import { useAppStore } from '@/store/appStore';
import type { PageName } from '@/types';
import { Map } from 'lucide-react';

import {
  LayoutDashboard,
  BarChart3,
  Keyboard,
  ScrollText,
  Radio,
  ChevronRight,
} from 'lucide-react';

const navItems: { id: PageName; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Controlpannel', icon: LayoutDashboard },
  { id: 'banpick', label: 'Ban & Pick', icon: Map },      // ← 新增
  { id: 'datapanel', label: 'Scoreboard', icon: BarChart3 },
  { id: 'hotkeys', label: 'Hotkeys', icon: Keyboard },
  { id: 'logs', label: 'Log', icon: ScrollText },
];

export default function Sidebar() {
  const currentPage = useAppStore(s => s.currentPage);
  const setPage = useAppStore(s => s.setPage);
  const gsiConnected = useAppStore(s => s.gsiConnected);

  return (
    <aside className="relative h-full w-full z-50 flex flex-col"
      style={{
        background: 'var(--sidebar-bg)',
        backdropFilter: 'blur(40px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(40px) saturate(1.4)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
      }}>
      {/* Logo */}
      <div className="px-5 pt-7 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Radio className="w-6 h-6 text-[#00F0FF]" />
            {gsiConnected && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400"
                style={{ animation: 'pulse-glow 2s ease-in-out infinite' }} />
            )}
          </div>
          <div>
            <h1 className="text-[15px] font-bold tracking-wider text-white leading-tight">
              Astra
            </h1>
            <p className="text-[10px] tracking-[0.2em] text-[#94A3B8]">DIRECTOR</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${gsiConnected ? 'bg-green-400' : 'bg-red-500'}`}
            style={gsiConnected ? { animation: 'pulse-glow 2s ease-in-out infinite' } : {}} />
          <span className="text-[11px] text-[#64748B]">
            {gsiConnected ? 'GSI connected' : 'GSI Unconnected'}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-5 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`nav-item w-full ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-[18px] h-[18px]" />
              <span className="flex-1 text-left">{item.label}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#00F0FF]" />}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-4 pb-5">
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4" />
        <div className="flex items-center gap-2 px-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#00F0FF] to-[#2979FF] flex items-center justify-center">
            <span className="text-[10px] font-bold text-black">H</span>
          </div>
          <div>
            <p className="text-[11px] text-[#94A3B8]">github@Hyun-05</p>
            <p className="text-[9px] text-[#475569]">v3.2.1 Astra</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
