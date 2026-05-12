import { useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';

interface OpacitySliderProps {
  value: number;
  onChange: (value: number) => void;
}

export default function OpacitySlider({ value, onChange }: OpacitySliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(value);
  const [trail, setTrail] = useState<{ x: number; opacity: number }[]>([]);

  const currentValue = isDragging ? dragValue : value;
  const percentage = Math.round(currentValue * 100);

  const handleMove = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    setDragValue(pct);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
    const onMouseUp = () => {
      setIsDragging(false);
      onChange(dragValue);
      // Fade trail
      setTimeout(() => setTrail([]), 500);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, dragValue, handleMove, onChange]);

  // Trail effect when dragging
  useEffect(() => {
    if (!isDragging) return;
    const interval = setInterval(() => {
      setTrail(prev => {
        const newTrail = [{ x: percentage, opacity: 0.6 }, ...prev].slice(0, 8);
        return newTrail.map((t, i) => ({ ...t, opacity: 0.6 - i * 0.07 }));
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isDragging, percentage]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleMove(e.clientX);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-[#94A3B8]">Black Opacity</span>
        <span className="text-sm font-bold font-display text-[#00F0FF] w-12 text-right">
          {percentage}%
        </span>
      </div>

      <div
        ref={trackRef}
        className="relative h-2 rounded-full cursor-pointer"
        style={{ background: 'rgba(255,255,255,0.08)' }}
        onMouseDown={handleMouseDown}
      >
        {/* Track fill */}
        <motion.div
          className="absolute left-0 top-0 h-full rounded-full"
          style={{
            width: `${percentage}%`,
            background: 'linear-gradient(90deg, #00F0FF, #2979FF)',
          }}
          animate={{ width: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />

        {/* Trail dots */}
        {trail.map((t, i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 -translate-y-1/2 w-1 h-3 rounded-full"
            style={{
              left: `${t.x}%`,
              background: `rgba(0, 240, 255, ${t.opacity})`,
              filter: 'blur(1px)',
            }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        ))}

        {/* Thumb */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
          style={{ left: `${percentage}%` }}
          animate={{ left: `${percentage}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white shadow-lg transition-shadow ${isDragging ? 'shadow-[0_0_15px_rgba(0,240,255,0.6)]' : ''}`}
            style={{
              border: '2px solid #00F0FF',
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}
