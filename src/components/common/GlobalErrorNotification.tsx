import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  WifiOff,
  Radio,
  HardDrive,
  ShieldAlert,
  AlertTriangle,
  X,
  Activity,
} from 'lucide-react';
import { ErrorNotificationService, SystemErrorEvent } from '../../services/ErrorNotificationService.js';

interface GlobalErrorNotificationProps {
  onOpenDiagnostics?: () => void;
}

export const GlobalErrorNotification: React.FC<GlobalErrorNotificationProps> = ({ onOpenDiagnostics }) => {
  const [activeErrors, setActiveErrors] = useState<SystemErrorEvent[]>([]);

  useEffect(() => {
    const unsubscribe = ErrorNotificationService.subscribe((event) => {
      setActiveErrors((prev) => [event, ...prev.slice(0, 2)]); // Show max 3 toast banners simultaneously
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleDismiss = (id: string) => {
    setActiveErrors((prev) => prev.filter((item) => item.id !== id));
  };

  const getCategoryIcon = (category: SystemErrorEvent['category']) => {
    switch (category) {
      case 'network':
        return <WifiOff className="w-5 h-5 text-amber-400 shrink-0" />;
      case 'communication':
        return <Radio className="w-5 h-5 text-red-400 shrink-0" />;
      case 'storage':
        return <HardDrive className="w-5 h-5 text-orange-400 shrink-0" />;
      case 'crypto':
        return <ShieldAlert className="w-5 h-5 text-purple-400 shrink-0" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />;
    }
  };

  const getCategoryBorderColor = (category: SystemErrorEvent['category']) => {
    switch (category) {
      case 'network':
        return 'border-amber-500/40 bg-amber-950/30';
      case 'communication':
        return 'border-red-500/40 bg-red-950/30';
      case 'storage':
        return 'border-orange-500/40 bg-orange-950/30';
      case 'crypto':
        return 'border-purple-500/40 bg-purple-950/30';
      default:
        return 'border-yellow-500/40 bg-yellow-950/30';
    }
  };

  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-[9999] pointer-events-none space-y-3">
      <AnimatePresence>
        {activeErrors.map((err) => (
          <motion.div
            key={err.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className={`pointer-events-auto p-4 border rounded-2xl shadow-2xl backdrop-blur-md text-white font-sans ${getCategoryBorderColor(
              err.category
            )}`}
          >
            <div className="flex items-start justify-between space-x-3">
              <div className="flex items-start space-x-3">
                {getCategoryIcon(err.category)}
                <div className="space-y-1">
                  <div className="text-xs font-mono font-bold tracking-wider text-white">
                    {err.title}
                  </div>
                  <p className="text-[11px] font-mono text-white/80 leading-relaxed break-words">
                    {err.message}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDismiss(err.id)}
                className="p-1 text-white/50 hover:text-white rounded-lg transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
              <span className="text-white/40">
                {new Date(err.timestamp).toLocaleTimeString()}
              </span>

              {onOpenDiagnostics && (
                <button
                  type="button"
                  onClick={() => {
                    handleDismiss(err.id);
                    onOpenDiagnostics();
                  }}
                  className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-[#00e5ff] border border-cyan-500/40 rounded-lg flex items-center space-x-1 font-bold transition-all"
                >
                  <Activity className="w-3 h-3 text-[#00e5ff]" />
                  <span>RUN DIAGNOSTICS</span>
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
