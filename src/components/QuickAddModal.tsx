import { motion } from 'framer-motion';
import { Plus, Minus, Scan, Target, X } from 'lucide-react';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (action: 'expense' | 'income' | 'scan' | 'goal' | 'borrow' | 'plan') => void;
}

const QuickAddModal = ({ isOpen, onClose, onSelectAction }: QuickAddModalProps) => {
  if (!isOpen) return null;

  const handleAction = (action: 'expense' | 'income' | 'scan' | 'goal' | 'borrow' | 'plan') => {
    onSelectAction(action);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
    >
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>

      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            What would you like to add?
          </h2>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </motion.button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Add Income */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleAction('income')}
            className="flex flex-col items-center justify-center p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl border-2 border-transparent hover:border-green-500 transition-all"
          >
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-3">
              <Plus className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Add Income</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
              Salary, freelance, etc.
            </p>
          </motion.button>

          {/* Add Expense */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleAction('expense')}
            className="flex flex-col items-center justify-center p-6 bg-red-50 dark:bg-red-900/20 rounded-2xl border-2 border-transparent hover:border-red-500 transition-all"
          >
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mb-3">
              <Minus className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Add Expense</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
              Food, transport, etc.
            </p>
          </motion.button>

          {/* Scan Receipt */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleAction('scan')}
            className="flex flex-col items-center justify-center p-6 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border-2 border-transparent hover:border-purple-500 transition-all"
          >
            <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mb-3">
              <Scan className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Scan Receipt</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
              Upload & extract data
            </p>
          </motion.button>

          {/* Add Goal */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleAction('goal')}
            className="flex flex-col items-center justify-center p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl border-2 border-transparent hover:border-yellow-500 transition-all"
          >
            <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mb-3">
              <Target className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Add Goal</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
              Save for something
            </p>
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default QuickAddModal;
