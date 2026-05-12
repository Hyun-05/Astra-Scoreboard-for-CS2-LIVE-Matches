import { useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
import type { Player } from '@/types';
import { gsap } from 'gsap';
import CountUp from 'react-countup';
import { Shield, Flame, Crosshair, Skull, HandHelping, Target } from 'lucide-react';

interface PlayerTableProps {
  team: 'CT' | 'T';
}

export default function PlayerTable({ team }: PlayerTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const isAnimating = useRef(false);
  const prevPlayers = useRef<Player[]>([]);

  const match = useAppStore(s => s.match);
  const players = team === 'CT' ? match.teamLeft.players : match.teamRight.players;
  
  // ========== 和 OBS 端统一：按 ADR 排序 ==========
  const sortedPlayers = [...players].sort((a, b) => (b.adr || 0) - (a.adr || 0));

  const isCyan = team === 'CT';
  const accentColor = isCyan ? '#00F0FF' : '#FF3D00';
  const TeamIcon = isCyan ? Shield : Flame;
  const teamName = isCyan ? match.teamLeft.name : match.teamRight.name;
  const mapScore = isCyan ? match.teamLeft.mapScore : match.teamRight.mapScore;
  const opponentMapScore = isCyan ? match.teamRight.mapScore : match.teamLeft.mapScore;

  // Check if order changed
  const orderChanged = useCallback(() => {
    if (prevPlayers.current.length !== sortedPlayers.length) return true;
    for (let i = 0; i < sortedPlayers.length; i++) {
      if (prevPlayers.current[i]?.steamid !== sortedPlayers[i]?.steamid) return true;
    }
    return false;
  }, [sortedPlayers]);

  useEffect(() => {
    if (isAnimating.current) return;
    if (!orderChanged()) {
      prevPlayers.current = sortedPlayers.map(p => ({ ...p }));
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const currentRows = Array.from(rowsRef.current.values());
    if (currentRows.length === 0) {
      prevPlayers.current = sortedPlayers.map(p => ({ ...p }));
      return;
    }

    isAnimating.current = true;

    const oldPositions = new Map<string, DOMRect>();
    currentRows.forEach(row => {
      const id = row.dataset.steamid;
      if (id) oldPositions.set(id, row.getBoundingClientRect());
    });

    prevPlayers.current = sortedPlayers.map(p => ({ ...p }));

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const newRows = Array.from(rowsRef.current.values());
        const newPositions = new Map<string, DOMRect>();
        newRows.forEach(row => {
          const id = row.dataset.steamid;
          if (id) newPositions.set(id, row.getBoundingClientRect());
        });

        const inversions: { el: HTMLDivElement; fromY: number }[] = [];
        newRows.forEach(row => {
          const id = row.dataset.steamid;
          if (!id) return;
          const oldPos = oldPositions.get(id);
          const newPos = newPositions.get(id);
          if (oldPos && newPos) {
            const fromY = oldPos.top - newPos.top;
            if (Math.abs(fromY) > 1) {
              inversions.push({ el: row, fromY });
            }
          }
        });

        if (inversions.length === 0) {
          isAnimating.current = false;
          return;
        }

        inversions.forEach(({ el, fromY }) => {
          gsap.set(el, { y: fromY, transformPerspective: 500 });
        });

        const tl = gsap.timeline({
          onComplete: () => {
            isAnimating.current = false;
          },
        });

        tl.to(inversions.map(({ el }) => el), {
          y: 0,
          duration: 0.45,
          ease: 'power2.out',
          stagger: 0.015,
        }, 0);

        tl.fromTo(
          inversions.map(({ el }) => el),
          {
            rotationX: -15,
            filter: 'brightness(0.6)',
          },
          {
            rotationX: 0,
            filter: 'brightness(1)',
            duration: 0.4,
            ease: 'power2.out',
            stagger: 0.015,
          },
          0,
        );
      });
    });
  }, [sortedPlayers, orderChanged]);

  // ========== 和 OBS 端统一：ADR 最高者高亮 ==========
  const topAdr = sortedPlayers.length > 0 ? Math.max(...sortedPlayers.map(p => p.adr || 0)) : 0;

  return (
    <div
      className="liquid-glass rounded-2xl overflow-hidden flex flex-col"
      style={{ borderTop: `2px solid ${accentColor}40` }}
    >
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <TeamIcon className="w-5 h-5" style={{ color: accentColor }} />
          <h3 className="text-base font-bold text-white tracking-wide">{teamName}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-display text-lg font-bold" style={{ color: accentColor }}>
            {mapScore}
          </span>
          <span className="text-white/20 text-sm">:</span>
          <span className="font-display text-lg font-bold text-white/40">
            {opponentMapScore}
          </span>
        </div>
      </div>

      {/* Table Header —— 和 OBS 端列统一 */}
      <div className="px-5 py-2.5 grid grid-cols-[1fr_48px_48px_48px_56px_52px] gap-2 text-[11px] font-bold text-[#64748B] uppercase tracking-widest font-display"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span>Player</span>
        <span className="text-right flex items-center justify-end gap-1">
          <Crosshair className="w-3 h-3" />K
        </span>
        <span className="text-right flex items-center justify-end gap-1">
          <Skull className="w-3 h-3" />D
        </span>
        <span className="text-right flex items-center justify-end gap-1">
          <HandHelping className="w-3 h-3" />A
        </span>
        <span className="text-right">K/D</span>
        <span className="text-right flex items-center justify-end gap-1">
          <Target className="w-3 h-3" />ADR
        </span>
      </div>

      {/* Player Rows */}
      <div ref={containerRef} className="flex-1 overflow-y-auto scrollbar-thin">
        {sortedPlayers.length === 0 ? (
          <div className="px-5 py-12 text-center text-[#475569] text-sm">
            waiting...
          </div>
        ) : (
          sortedPlayers.map((player, index) => {
            // ========== 和 OBS 端统一：ADR 最高者高亮 ==========
            const isTop = (player.adr || 0) === topAdr && topAdr > 0;
            return (
              <div
                key={player.steamid}
                ref={el => {
                  if (el) rowsRef.current.set(player.steamid, el);
                  else rowsRef.current.delete(player.steamid);
                }}
                data-steamid={player.steamid}
                className="px-5 py-2.5 grid grid-cols-[1fr_48px_48px_48px_56px_52px] gap-2 items-center transition-colors hover:bg-white/[0.03]"
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  willChange: 'transform',
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] text-[#475569] font-display w-4">{index + 1}</span>
                  <span className={`text-sm font-medium truncate ${isTop ? 'font-semibold' : 'text-[#94A3B8]'}`}
                    style={{ color: isTop ? accentColor : undefined }}>
                    {player.name}
                  </span>
                  {isTop && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                      style={{
                        background: `${accentColor}20`,
                        color: accentColor,
                      }}>
                      TOP
                    </span>
                  )}
                </div>
                <span className="text-right font-mono-data text-sm tabular-nums"
                  style={{ color: isTop ? accentColor : '#E2E8F0' }}>
                  <CountUp end={player.kills} duration={0.6} />
                </span>
                <span className="text-right font-mono-data text-sm tabular-nums text-[#64748B]">
                  <CountUp end={player.deaths} duration={0.6} />
                </span>
                <span className="text-right font-mono-data text-sm tabular-nums text-[#94A3B8]">
                  <CountUp end={player.assists} duration={0.6} />
                </span>
                <span className="text-right font-mono-data text-sm font-bold tabular-nums"
                  style={{ color: isTop ? accentColor : '#E2E8F0' }}>
                  {player.kd.toFixed(2)}
                </span>
                <span className="text-right font-mono-data text-sm font-bold tabular-nums"
                  style={{ color: isTop ? accentColor : '#94A3B8' }}>
                  {player.adr || 0}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}