import { useState, useCallback } from 'react';

export interface ConfirmationOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
}

export const useConfirmation = () => {
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    isDangerous: boolean;
    onResolve?: (value: boolean) => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    isDangerous: false
  });

  const confirm = useCallback((options: ConfirmationOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmation({
        isOpen: true,
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        isDangerous: options.isDangerous || false,
        onResolve: resolve
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    confirmation.onResolve?.(true);
    setConfirmation(prev => ({ ...prev, isOpen: false }));
  }, [confirmation]);

  const handleCancel = useCallback(() => {
    confirmation.onResolve?.(false);
    setConfirmation(prev => ({ ...prev, isOpen: false }));
  }, [confirmation]);

  return {
    confirmation: { ...confirmation, onConfirm: handleConfirm, onCancel: handleCancel },
    confirm
  };
};
