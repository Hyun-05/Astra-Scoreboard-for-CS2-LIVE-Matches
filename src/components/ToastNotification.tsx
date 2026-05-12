import { useAppStore } from '@/store/appStore';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react';

export default function ToastNotification() {
  const toasts = useAppStore(s => s.toasts);

  const icons = {
    success: CheckCircle,
    info: Info,
    warning: AlertCircle,
    error: XCircle,
  };

  const colors = {
    success: { icon: '#00F0FF', border: 'rgba(0,240,255,0.3)', bg: 'rgba(0,240,255,0.05)' },
    info: { icon: '#2979FF', border: 'rgba(41,121,255,0.3)', bg: 'rgba(41,121,255,0.05)' },
    warning: { icon: '#FF9100', border: 'rgba(255,145,0,0.3)', bg: 'rgba(255,145,0,0.05)' },
    error: { icon: '#FF3D00', border: 'rgba(255,61,0,0.3)', bg: 'rgba(255,61,0,0.05)' },
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => {
          const Icon = icons[toast.type];
          const color = colors[toast.type];
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="pointer-events-auto px-5 py-3 rounded-xl flex items-center gap-3 min-w-[200px]"
              style={{
                background: `rgba(15, 15, 18, 0.9)`,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: `1px solid ${color.border}`,
                boxShadow: `0 4px 20px rgba(0,0,0,0.3), 0 0 15px ${color.bg}`,
              }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" style={{ color: color.icon }} />
              <span className="text-sm font-medium text-white">{toast.message}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
