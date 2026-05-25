import { useState } from 'react';
import { useAppStore, type BpCustomColorKey } from '@/store/appStore';
import { RotateCcw } from 'lucide-react';
import { motion, Reorder } from 'framer-motion';
import { X, GripVertical, Copy, Check, Shield, Flame, Eye, EyeOff, Play, Pause } from 'lucide-react';

const MAP_POOL = [
  'Ancient', 'Anubis', 'Dust2', 'Inferno', 'Mirage',
  'Nuke', 'Overpass', 'Vertigo', 'Cache', 'Train',
];

type BpAction = 'ban' | 'pick' | 'decider';

export default function BanPickPage() {
  const bp = useAppStore(s => s.bp);
  const setBpAction = useAppStore(s => s.setBpAction);
  const setBpSequence = useAppStore(s => s.setBpSequence);
  const resetBp = useAppStore(s => s.resetBp);
  const match = useAppStore(s => s.match);
  const bpStyle = useAppStore(s => s.bpStyle);
  const bpColors = useAppStore(s => s.bpColors);
  const bpAnimEnabled = useAppStore(s => s.bpAnimEnabled);
  const setBpAnimEnabled = useAppStore(s => s.setBpAnimEnabled);
  const bpCustomColors = useAppStore(s => s.bpCustomColors);
  const setBpCustomColors = useAppStore(s => s.setBpCustomColors);
  const resetBpCustomColors = useAppStore(s => s.resetBpCustomColors);
  const [copied, setCopied] = useState(false);
  const [cardsVisible, setCardsVisible] = useState(true);
  const [showColorPanel, setShowColorPanel] = useState(false);

  const isInSequence = (map: string) => bp.sequence.some(x => x.map === map);
  const isFull = bp.sequence.length >= 7;

  const handleMapClick = (map: string) => {
    if (isInSequence(map) || isFull) return;
    const action: BpAction = bp.sequence.length === 6 ? 'decider' : 'ban';
    setBpAction(map, action, 'left', null);
  };

  const handleRemove = (map: string) => {
    setBpAction(map, 'none', null, null);
  };

  const handleActionChange = (map: string, action: BpAction) => {
    const item = bp.sequence.find(x => x.map === map);
    if (!item) return;
    if (action === 'decider') {
      setBpAction(map, action, null, null);
    } else {
      setBpAction(map, action, item.team || 'left', item.side);
    }
  };

  const handleTeamChange = (map: string, team: 'left' | 'right') => {
    const item = bp.sequence.find(x => x.map === map);
    if (item && item.action !== 'decider') {
      setBpAction(map, item.action as BpAction, team, item.side);
    }
  };

  // 选边切换：对方队伍打 CT 还是 T
  const handleSideChange = (map: string, side: 'ct' | 't') => {
    const item = bp.sequence.find(x => x.map === map);
    if (item && item.action === 'pick') {
      setBpAction(map, item.action, item.team, side);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText('http://127.0.0.1:8080/bp');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleVisibility = () => {
    const newVisible = !cardsVisible;
    setCardsVisible(newVisible);
    (window as any).electronAPI?.updateObsState?.({ bpCardsVisible: newVisible });
  };

  const getMapImg = (map: string) => `./maps/${map}.png`;

  // 颜色选择器组件
  const colorGroups: { label: string; keys: { key: BpCustomColorKey; label: string }[] }[] = [
    { label: 'Title', keys: [{ key: 'titleStart', label: 'Start' }, { key: 'titleEnd', label: 'End' }] },
    { label: 'Team Bar', keys: [{ key: 'teamBarStart', label: 'Start' }, { key: 'teamBarEnd', label: 'End' }] },
    { label: 'Ban', keys: [{ key: 'banTag', label: 'Tag' }, { key: 'banText', label: 'Text' }] },
    { label: 'Pick', keys: [{ key: 'pickTag', label: 'Tag' }, { key: 'pickText', label: 'Text' }] },
    { label: 'Decider', keys: [{ key: 'deciderTag', label: 'Tag' }, { key: 'deciderText', label: 'Text' }] },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col p-6 lg:p-8 overflow-hidden"
    >
      {/* Header + Animation Controls */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Ban & Pick</h1>
          <button
            onClick={handleCopyUrl}
            className="text-xs text-[#00F0FF] font-display mt-1 tracking-wider flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
          >
            URL: http://127.0.0.1:8080/bp
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
        <div className="flex items-center gap-4">
          {/* Animation Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Animation</span>
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
              <button
                onClick={() => setBpAnimEnabled(true)}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                  bpAnimEnabled ? 'bg-white/15 text-white' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Play className="w-3 h-3" /> On
              </button>
              <button
                onClick={() => setBpAnimEnabled(false)}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                  !bpAnimEnabled ? 'bg-white/15 text-white' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Pause className="w-3 h-3" /> Off
              </button>
            </div>
            {bpAnimEnabled && (
              <button
                onClick={handleToggleVisibility}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                  cardsVisible
                    ? 'bg-green-500/15 text-green-400 border border-green-500/30'
                    : 'bg-white/5 text-gray-400 border border-white/10'
                }`}
              >
                {cardsVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {cardsVisible ? 'Show' : 'Hide'}
              </button>
            )}
          </div>
          <div className="text-xs text-gray-500 font-mono-data">
            {bp.sequence.length} / 7
          </div>
        </div>
      </div>

      {/* Team names */}
      <div className="flex items-center justify-center gap-4 mb-3">
        <span className="text-sm font-bold text-white truncate max-w-[200px]">
          {match.teamLeft.name || 'Left Team'}
        </span>
        <span className="text-xs text-gray-600 font-medium">VS</span>
        <span className="text-sm font-bold text-white truncate max-w-[200px]">
          {match.teamRight.name || 'Right Team'}
        </span>
      </div>

      {/* Style switcher + Color Customization */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <span className="text-xs text-gray-500 uppercase tracking-wider">Mask Style</span>
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
          {(['mono', 'stylized', 'glitch'] as const).map(style => (
            <button
              key={style}
              onClick={() => useAppStore.getState().setBpStyle(style)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                bpStyle === style ? 'bg-white/15 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {style.charAt(0).toUpperCase() + style.slice(1)}
            </button>
          ))}
        </div>

        {bpStyle === 'stylized' && (
          <div className="flex items-center gap-2">
            {(['dark', 'mid', 'light'] as const).map(tone => (
              <div key={tone} className="flex flex-col items-center gap-0.5">
                <input
                  type="color"
                  value={bpColors[tone]}
                  onChange={(e) => useAppStore.getState().setBpColors({ ...bpColors, [tone]: e.target.value })}
                  className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                  title={`${tone.charAt(0).toUpperCase() + tone.slice(1)} tone`}
                />
                <span className="text-[8px] text-gray-500 uppercase">{tone}</span>
              </div>
            ))}
          </div>
        )}

        {/* Color Customization Toggle */}
        <button
          onClick={() => setShowColorPanel(!showColorPanel)}
          className={`ml-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
            showColorPanel ? 'bg-yellow-500/15 text-yellow-400' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Colors
        </button>
      </div>

      {/* Color Customization Panel */}
      {showColorPanel && (
        <div className="flex gap-4 mb-3 p-3 bg-white/5 rounded-lg flex-wrap items-end">
          {colorGroups.map(group => (
            <div key={group.label} className="flex flex-col gap-1">
              <span className="text-[9px] text-gray-500 uppercase">{group.label}</span>
              <div className="flex gap-1.5">
                {group.keys.map(({ key, label }) => (
                  <div key={key} className="flex flex-col items-center gap-0.5">
                    <input
                      type="color"
                      value={bpCustomColors[key]}
                      onChange={(e) => setBpCustomColors({ [key]: e.target.value })}
                      className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer p-0"
                      title={label}
                    />
                    <span className="text-[7px] text-gray-500 uppercase">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {/* Reset */}
          <button
            onClick={resetBpCustomColors}
            className="px-3 py-1.5 rounded-md text-[10px] font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1 border border-white/5 hover:border-white/10"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>
      )}

      {/* Map pool grid */}
      <div className="grid grid-cols-5 gap-2 mb-3">
        {MAP_POOL.map(map => {
          const inSeq = isInSequence(map);
          const disabled = inSeq || isFull;
          return (
            <button
              key={map}
              onClick={() => handleMapClick(map)}
              disabled={disabled}
              className={`
                relative h-20 w-full rounded-xl overflow-hidden border-2 transition-all duration-200
                ${inSeq
                  ? 'border-white/5 opacity-30 cursor-not-allowed grayscale'
                  : isFull
                  ? 'border-white/5 opacity-20 cursor-not-allowed'
                  : 'border-white/10 hover:border-white/30 hover:scale-[1.02] cursor-pointer'}
              `}
            >
              <img
                src={getMapImg(map)}
                alt={map}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-center py-0.5">
                <span className="text-[10px] text-white/80 font-medium">{map}</span>
              </div>
              {inSeq && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Added</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Sequence */}
      <div className="liquid-glass rounded-xl p-4 flex-1 min-h-0 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm text-gray-400 uppercase tracking-wider">Sequence</h3>
          {bp.sequence.length > 0 && (
            <button
              onClick={resetBp}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        {bp.sequence.length === 0 ? (
          <p className="text-gray-500 text-sm">Click a map to add to sequence (max 7)</p>
        ) : (
          <Reorder.Group
            axis="y"
            values={bp.sequence}
            onReorder={setBpSequence}
            className="space-y-2"
          >
            {bp.sequence.map((item, index) => (
              <Reorder.Item
                key={item.map}
                value={item}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
              >
                {/* Drag handle */}
                <div className="cursor-grab active:cursor-grabbing text-gray-500 shrink-0">
                  <GripVertical className="w-4 h-4" />
                </div>

                {/* Order number */}
                <span className="text-[10px] text-gray-600 font-mono-data w-5 shrink-0">
                  {index + 1}{['st','nd','rd','th','th','th','th'][index]}
                </span>

                {/* Map name */}
                <span className="text-sm font-medium text-white w-20 shrink-0">{item.map}</span>

                {/* Action: Ban / Pick / Decider */}
                <div className="flex items-center gap-1">
                  {(['ban', 'pick', 'decider'] as BpAction[]).map(action => (
                    <button
                      key={action}
                      onClick={() => handleActionChange(item.map, action)}
                      className={`
                        px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all
                        ${item.action === action
                          ? action === 'ban'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                            : action === 'pick'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : 'bg-transparent text-gray-500 border border-transparent hover:bg-white/5'}
                      `}
                    >
                      {action}
                    </button>
                  ))}
                </div>

                {/* Team selector (hidden for decider) */}
                {item.action !== 'decider' && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleTeamChange(item.map, 'left')}
                      className={`
                        px-2 py-1 rounded text-[10px] font-bold transition-all truncate max-w-[80px]
                        ${item.team === 'left'
                          ? 'bg-white/20 text-white border border-white/30'
                          : 'bg-white/5 text-gray-500 border border-transparent hover:bg-white/10'}
                      `}
                    >
                      {match.teamLeft.name || 'Left'}
                    </button>
                    <button
                      onClick={() => handleTeamChange(item.map, 'right')}
                      className={`
                        px-2 py-1 rounded text-[10px] font-bold transition-all truncate max-w-[80px]
                        ${item.team === 'right'
                          ? 'bg-white/20 text-white border border-white/30'
                          : 'bg-white/5 text-gray-500 border border-transparent hover:bg-white/10'}
                      `}
                    >
                      {match.teamRight.name || 'Right'}
                    </button>
                  </div>
                )}

                {/* Side selector: CT / T (only for Pick) */}
                {item.action === 'pick' && (
                  <div className="flex items-center gap-1">
                    {(() => {
                      // 对方队伍名
                      const oppName = item.team === 'left'
                        ? match.teamRight.name || 'Right'
                        : match.teamLeft.name || 'Left';
                      return (
                        <>
                          <span className="text-[8px] text-gray-500 uppercase mr-0.5">{oppName}</span>
                          <button
                            onClick={() => handleSideChange(item.map, 'ct')}
                            className={`
                              px-2 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1
                              ${item.side === 'ct'
                                ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40'
                                : 'bg-white/5 text-gray-500 border border-transparent hover:bg-white/10'}
                            `}
                          >
                            <Shield className="w-3 h-3" /> CT
                          </button>
                          <button
                            onClick={() => handleSideChange(item.map, 't')}
                            className={`
                              px-2 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1
                              ${item.side === 't'
                                ? 'bg-[#FF9100]/20 text-[#FF9100] border border-[#FF9100]/40'
                                : 'bg-white/5 text-gray-500 border border-transparent hover:bg-white/10'}
                            `}
                          >
                            <Flame className="w-3 h-3" /> T
                          </button>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Spacer for decider */}
                {item.action === 'decider' && <div className="ml-auto" />}

                {/* Delete */}
                <button
                  onClick={() => handleRemove(item.map)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        )}
      </div>
    </motion.div>
  );
}