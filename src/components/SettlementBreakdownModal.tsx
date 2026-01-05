import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Receipt, ArrowRight, Check } from 'lucide-react';
import type { Trip, TripExpense } from '../types';

interface SettlementBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtor: { participant: any; balance: number };
  creditor: { participant: any; balance: number };
  expenses: TripExpense[];
  trip: Trip | undefined;
  onSettle?: (transfer: TripExpense) => Promise<void>;
}

export const SettlementBreakdownModal = ({
  isOpen,
  onClose,
  debtor,
  creditor,
  expenses,
  trip,
  onSettle
}: SettlementBreakdownModalProps) => {
  const [isSettling, setIsSettling] = useState(false);

  if (!isOpen) return null;

  // Calculate breakdown of why debtor owes money (includes expenses AND transfers)
  const relevantExpenses = expenses.filter(expense => {
    // Include expenses where creditor paid and debtor has a split
    if (expense.type === 'expense' && expense.paidBy === creditor.participant?.id) {
      return expense.split.some(s => s.participantId === debtor.participant?.id);
    }
    // Include expenses where debtor paid and creditor has a split (reverse case)
    if (expense.type === 'expense' && expense.paidBy === debtor.participant?.id) {
      return expense.split.some(s => s.participantId === creditor.participant?.id);
    }
    // Include transfers between debtor and creditor
    if (expense.type === 'transfer') {
      const isRelevant =
        (expense.from === debtor.participant?.id && expense.transferredTo === creditor.participant?.id) ||
        (expense.from === creditor.participant?.id && expense.transferredTo === debtor.participant?.id);
      return isRelevant;
    }
    return false;
  });

  const breakdown = relevantExpenses.map(expense => {
    let amount = 0;
    let description = '';

    if (expense.type === 'expense') {
      const debtorSplit = expense.split.find(s => s.participantId === debtor.participant?.id);
      const creditorSplit = expense.split.find(s => s.participantId === creditor.participant?.id);

      if (expense.paidBy === creditor.participant?.id && debtorSplit) {
        // Creditor paid, debtor owes their split
        amount = debtorSplit.amount;
        description = `${creditor.participant.name} paid for ${expense.title}`;
      } else if (expense.paidBy === debtor.participant?.id && creditorSplit) {
        // Debtor paid, creditor owes (reduces debt)
        amount = -creditorSplit.amount;
        description = `${debtor.participant.name} paid for ${expense.title}`;
      }
    } else if (expense.type === 'transfer') {
      // Transfers: when debtor transfers to creditor, it reduces the debt (negative amount)
      // when creditor transfers to debtor, it increases the debt (positive amount)
      if (expense.from === debtor.participant?.id && expense.transferredTo === creditor.participant?.id) {
        // Debtor paid creditor - reduces debt
        amount = -expense.amount;
        description = `${debtor.participant?.name} transferred to ${creditor.participant?.name}`;
      } else if (expense.from === creditor.participant?.id && expense.transferredTo === debtor.participant?.id) {
        // Creditor paid debtor - increases debt (creditor gave money to debtor)
        amount = expense.amount;
        description = `${creditor.participant?.name} transferred to ${debtor.participant?.name}`;
      }
    }

    return {
      ...expense,
      amount,
      description,
      icon: expense.type === 'transfer' ? '💸' : ''
    };
  }).filter(e => e.amount !== 0);

  const totalOwed = Math.abs(debtor.balance);
  const isDebtorCurrentUser = debtor.participant?.isCurrentUser;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm max-h-[80vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between z-10 rounded-t-3xl">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Settlement Details</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Summary Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {debtor.participant?.name[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {isDebtorCurrentUser ? 'You' : debtor.participant?.name}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {isDebtorCurrentUser ? 'will give' : 'gives'}
                  </p>
                </div>
              </div>

              <ArrowRight className="w-6 h-6 text-gray-400" />

              <div className="flex items-center gap-3">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white text-right">
                    {creditor.participant?.isCurrentUser ? 'You' : creditor.participant?.name}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 text-right">
                    {creditor.participant?.isCurrentUser ? 'will receive' : 'receives'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-400 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {creditor.participant?.name[0].toUpperCase()}
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">₹{totalOwed.toFixed(2)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Settlement Amount</p>
            </div>
          </div>

          {/* Expense Breakdown */}
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Expense Breakdown</h3>
          <div className="space-y-2">
            {breakdown.map((expense, index) => (
              <motion.div
                key={expense.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-400 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Receipt className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {expense.title}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {new Date(expense.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {expense.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-bold text-sm ${expense.amount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {expense.amount > 0 ? '+' : ''}₹{Math.abs(expense.amount).toFixed(2)}
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                      your share
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {breakdown.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No expense details available</p>
            </div>
          )}
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800 space-y-3 flex-shrink-0">
          {onSettle && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={async () => {
                if (!trip || isSettling) return;
                setIsSettling(true);
                try {
                  const transfer: TripExpense = {
                    id: `settlement_${Date.now()}`,
                    tripId: trip.id,
                    userId: trip.participants.find(p => p.isCurrentUser)?.id || '',
                    type: 'transfer',
                    title: `Settlement: ${debtor.participant?.name} → ${creditor.participant?.name}`,
                    amount: Math.abs(debtor.balance),
                    category: 'settlement',
                    icon: '💸',
                    date: new Date(),
                    from: debtor.participant?.id,
                    transferredTo: creditor.participant?.id,
                    split: [],
                    createdAt: new Date(),
                    updatedAt: new Date()
                  };
                  await onSettle(transfer);
                  onClose();
                } catch (error) {
                  console.error('Error recording settlement:', error);
                  alert('Failed to record settlement. Please try again.');
                  setIsSettling(false);
                }
              }}
              disabled={isSettling}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-semibold shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSettling ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Mark as Settled
                </>
              )}
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="w-full px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-all"
          >
            Got it
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};
