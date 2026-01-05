import { motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Edit2, Trash2 } from 'lucide-react';
import type { TripExpense, Trip } from '../types';
import { getExpenseIcon } from '../utils/expenseIcons';

interface ExpenseDetailModalProps {
  expense: TripExpense;
  trip: Trip;
  onClose: () => void;
  onEdit: (expense: TripExpense) => void;
  onDelete?: (expenseId: string) => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

const ExpenseDetailModal = ({
  expense,
  trip,
  onClose,
  onEdit,
  onDelete,
  onNavigatePrev,
  onNavigateNext,
  hasPrev = false,
  hasNext = false,
}: ExpenseDetailModalProps) => {
  const getPayer = () => {
    if (expense.type === 'expense' && expense.paidBy) {
      return trip.participants.find(p => p.id === expense.paidBy);
    }
    if (expense.type === 'income' && expense.receivedBy) {
      return trip.participants.find(p => p.id === expense.receivedBy);
    }
    if (expense.type === 'transfer' && expense.from) {
      return trip.participants.find(p => p.id === expense.from);
    }
    return null;
  };

  const getPayerLabel = () => {
    if (expense.type === 'expense') return 'Paid By';
    if (expense.type === 'income') return 'From';
    if (expense.type === 'transfer') return 'From';
    return 'From';
  };

  const payer = getPayer();
  const { icon: ExpenseIcon, color } = getExpenseIcon(expense.title, expense.category);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-500 to-teal-500 text-white p-6 relative">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={onNavigatePrev}
                disabled={!hasPrev}
                className={`p-2 rounded-lg transition-colors ${
                  hasPrev ? 'hover:bg-white/10' : 'opacity-30 cursor-not-allowed'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={onNavigateNext}
                disabled={!hasNext}
                className={`p-2 rounded-lg transition-colors ${
                  hasNext ? 'hover:bg-white/10' : 'opacity-30 cursor-not-allowed'
                }`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => onEdit(expense)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="text-center">
            <div className={`w-20 h-20 bg-gradient-to-br ${color} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl`}>
              <ExpenseIcon className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-1">{expense.title}</h2>
            <p className="text-white/80 text-sm">
              {new Date(expense.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-240px)]">
          {/* Payer Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
              {getPayerLabel()}
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white font-bold">
                    {payer?.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {payer?.name ?? 'Unknown'}
                    </p>
                    {payer?.isCurrentUser && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">Me</p>
                    )}
                  </div>
                </div>
                <p className="text-lg font-bold text-orange-600">
                  ₹{expense.amount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Participants Section */}
          {expense.split && expense.split.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
                Participants
              </h3>
              <div className="space-y-2">
                {expense.split.map((split) => {
                  const participant = trip.participants.find(
                    (p) => p.id === split.participantId
                  );
                  return (
                    <div
                      key={split.participantId}
                      className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {participant?.name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {participant?.name ?? 'Unknown'}
                            </p>
                            {participant?.isCurrentUser && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Me
                              </p>
                            )}
                          </div>
                        </div>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          ₹{split.amount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category */}
          {expense.category && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                Category
              </h3>
              <p className="text-gray-900 dark:text-white capitalize">{expense.category}</p>
            </div>
          )}

          {/* Delete Button */}
          {onDelete && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => onDelete(expense.id)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                Delete Expense
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ExpenseDetailModal;
