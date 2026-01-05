import { motion } from 'framer-motion';
import { X, TrendingUp, TrendingDown, IndianRupee } from 'lucide-react';
import type { Transaction } from '../types';

interface TransactionSummaryBarProps {
  selectedTransactions: Transaction[];
  onCancel: () => void;
  onExport?: () => void;
  onDelete?: () => void;
}

export const TransactionSummaryBar = ({
  selectedTransactions,
  onCancel
}: TransactionSummaryBarProps) => {
  const income = selectedTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const expense = selectedTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const net = income - expense;
  const count = selectedTransactions.length;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-20 left-0 right-0 z-[9998] px-4"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {count} transaction{count !== 1 ? 's' : ''} selected
          </h3>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium">Income</span>
            </div>
            <span className="text-sm font-bold text-green-600 dark:text-green-400">
              ₹{income.toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col items-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="flex items-center gap-1 text-red-600 dark:text-red-400 mb-1">
              <TrendingDown className="w-4 h-4" />
              <span className="text-xs font-medium">Expense</span>
            </div>
            <span className="text-sm font-bold text-red-600 dark:text-red-400">
              ₹{expense.toLocaleString()}
            </span>
          </div>

          <div className={`flex flex-col items-center p-2 rounded-lg ${net >= 0
              ? 'bg-blue-50 dark:bg-blue-900/20'
              : 'bg-orange-50 dark:bg-orange-900/20'
            }`}>
            <div className={`flex items-center gap-1 mb-1 ${net >= 0
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-orange-600 dark:text-orange-400'
              }`}>
              <IndianRupee className="w-4 h-4" />
              <span className="text-xs font-medium">Net</span>
            </div>
            <span className={`text-sm font-bold ${net >= 0
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-orange-600 dark:text-orange-400'
              }`}>
              {net >= 0 ? '+' : ''}₹{net.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
