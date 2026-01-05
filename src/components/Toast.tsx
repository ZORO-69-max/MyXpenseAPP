import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X, Bell } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning' | 'notification';

export interface ToastProps {
  id: string;
  message: string;
  title?: string;
  variant?: ToastVariant;
  duration?: number;
  playSound?: boolean;
  onClick?: () => void;
  onClose: (id: string) => void;
}

const playNotificationSound = (variant: ToastVariant) => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    const frequencies = {
      success: 880,
      error: 300,
      warning: 440,
      info: 660,
      notification: 800
    };
    
    oscillator.frequency.value = frequencies[variant] || 660;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.25);
    
    if (variant === 'notification') {
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = 1000;
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.1, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.15);
      }, 150);
    }
  } catch (e) {
    console.log('Could not play notification sound');
  }
};

export const Toast = ({ 
  id, 
  message,
  title,
  variant = 'info', 
  duration = 4000, 
  playSound = false,
  onClick,
  onClose 
}: ToastProps) => {
  const hasPlayedSound = useRef(false);

  useEffect(() => {
    if (playSound && !hasPlayedSound.current) {
      hasPlayedSound.current = true;
      playNotificationSound(variant);
    }
  }, [playSound, variant]);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    notification: <Bell className="w-5 h-5 text-indigo-500" />
  };

  const colors = {
    success: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
    error: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
    info: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
    warning: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
    notification: 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800'
  };

  const progressColors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-amber-500',
    notification: 'bg-indigo-500'
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      onClick={onClick}
      className={`${colors[variant]} border rounded-xl shadow-lg overflow-hidden min-w-[300px] max-w-sm backdrop-blur-sm ${
        onClick ? 'cursor-pointer hover:shadow-xl transition-shadow' : ''
      }`}
    >
      <div className="p-3.5 flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">{icons[variant]}</div>
        <div className="flex-1 min-w-0">
          {title && (
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">
              {title}
            </p>
          )}
          <p className={`text-sm text-gray-700 dark:text-gray-300 leading-relaxed ${!title ? 'font-medium' : ''}`}>
            {message}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose(id);
          }}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <motion.div
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
        className={`h-0.5 origin-left ${progressColors[variant]}`}
      />
    </motion.div>
  );
};

export interface ToastContainerProps {
  toasts: ToastProps[];
  onClose: (id: string) => void;
}

export const ToastContainer = ({ toasts, onClose }: ToastContainerProps) => {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] flex flex-col gap-2 pointer-events-none px-4 w-full max-w-sm">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast {...toast} onClose={onClose} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};
