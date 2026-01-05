import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Check } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmationModal = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
  onConfirm,
  onCancel,
  isLoading = false
}: ConfirmationModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full border border-gray-200 dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Icon */}
              <div className="pt-6 flex justify-center">
                <div className={`p-3 rounded-full ${isDangerous ? 'bg-red-100 dark:bg-red-900/20' : 'bg-blue-100 dark:bg-blue-900/20'}`}>
                  {isDangerous ? (
                    <AlertTriangle className={`w-6 h-6 ${isDangerous ? 'text-red-500' : 'text-blue-500'}`} />
                  ) : (
                    <Check className="w-6 h-6 text-blue-500" />
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="px-6 pt-4 pb-2 text-center">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{message}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 p-6 pt-4">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onCancel}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelText}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={`flex-1 px-4 py-2.5 rounded-lg font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                    isDangerous
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    confirmText
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
