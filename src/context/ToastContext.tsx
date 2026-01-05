import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { ToastContainer } from '../components/Toast';
import type { ToastVariant } from '../components/Toast';

interface ToastOptions {
  duration?: number;
  playSound?: boolean;
}

interface ToastContextType {
  showToast: (message: string, variant?: ToastVariant, options?: ToastOptions) => string;
  success: (message: string, options?: ToastOptions) => string;
  error: (message: string, options?: ToastOptions) => string;
  info: (message: string, options?: ToastOptions) => string;
  warning: (message: string, options?: ToastOptions) => string;
  removeToast: (id: string) => void;
}

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
  playSound: boolean;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((
    message: string, 
    variant: ToastVariant = 'info', 
    options: ToastOptions = {}
  ) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const { duration = 3500, playSound = false } = options;

    const toast: Toast = {
      id,
      message,
      variant,
      duration,
      playSound
    };

    setToasts(prev => [...prev, toast]);
    return id;
  }, []);

  const success = useCallback((message: string, options?: ToastOptions) => {
    return showToast(message, 'success', options);
  }, [showToast]);

  const error = useCallback((message: string, options?: ToastOptions) => {
    return showToast(message, 'error', { duration: 4500, ...options });
  }, [showToast]);

  const info = useCallback((message: string, options?: ToastOptions) => {
    return showToast(message, 'info', options);
  }, [showToast]);

  const warning = useCallback((message: string, options?: ToastOptions) => {
    return showToast(message, 'warning', { duration: 4000, ...options });
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning, removeToast }}>
      {children}
      <ToastContainer 
        toasts={toasts.map(t => ({ ...t, onClose: removeToast }))} 
        onClose={removeToast} 
      />
    </ToastContext.Provider>
  );
};
