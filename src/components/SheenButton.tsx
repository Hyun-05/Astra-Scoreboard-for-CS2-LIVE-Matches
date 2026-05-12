import { useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SheenButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
}

export default function SheenButton({
  children,
  variant = 'primary',
  size = 'md',
  glow = false,
  className,
  onClick,
  ...props
}: SheenButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = btnRef.current;
    if (btn) {
      btn.classList.remove('btn-sheen-active');
      void btn.offsetWidth;
      btn.classList.add('btn-sheen-active');
      const onEnd = () => {
        btn.classList.remove('btn-sheen-active');
        btn.removeEventListener('animationend', onEnd);
      };
      btn.addEventListener('animationend', onEnd);
    }
    onClick?.(e);
  };

  const base = 'btn-sheen relative overflow-hidden rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 select-none';

  const sizes = {
    sm: 'px-4 py-1.5 text-xs',
    md: 'px-6 py-2.5 text-sm',
    lg: 'px-8 py-3.5 text-base',
  };

  const variants = {
    primary: cn(
      'text-black font-bold',
      'bg-gradient-to-r from-[#00F0FF] to-[#2979FF]',
      'hover:shadow-[0_0_20px_rgba(0,240,255,0.3),0_0_40px_rgba(0,240,255,0.1)]',
      'active:scale-[0.97]'
    ),
    danger: cn(
      'text-black font-bold',
      'bg-gradient-to-r from-[#FF9100] to-[#FF3D00]',
      'hover:shadow-[0_0_20px_rgba(255,61,0,0.3),0_0_40px_rgba(255,61,0,0.1)]',
      'active:scale-[0.97]'
    ),
    ghost: cn(
      'text-[#E2E8F0]',
      'bg-transparent border border-white/10',
      'hover:border-white/25 hover:bg-white/5',
      'hover:shadow-[0_0_12px_rgba(255,255,255,0.05)]',
      'active:scale-[0.97]'
    ),
  };

  return (
    <button
      ref={btnRef}
      className={cn(base, sizes[size], variants[variant], glow && (variant === 'primary' ? 'neon-glow-cyan' : variant === 'danger' ? 'neon-glow-orange' : ''), className)}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
}
