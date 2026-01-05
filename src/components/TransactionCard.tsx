import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Trash2, CheckCircle, HandCoins, Clock, ArrowRightLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import { SyncStatusIcon } from './SyncStatusIcon';
import { useSyncStatus } from '../hooks/useSyncStatus';
import type { Transaction } from '../types';

interface TransactionCardProps {
  transaction: Transaction;
  isSelected: boolean;
  selectionMode: boolean;
  isSwiped: boolean;
  onSwipe: (id: string | null) => void;
  onLongPressStart: (id: string) => void;
  onLongPressEnd: () => void;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
  runningBalance?: number;
}

export const TransactionCard = memo(({
  transaction,
  isSelected,
  selectionMode,
  isSwiped,
  onSwipe,
  onLongPressStart,
  onLongPressEnd,
  onToggleSelect,
  onDelete,
  runningBalance
}: TransactionCardProps) => {
  const navigate = useNavigate();
  const { status } = useSyncStatus();
  const isFromTrip = !!(transaction as any).tripId;

  const handlers = useSwipeable({
    onSwipedLeft: () => !selectionMode && onSwipe(transaction.id),
    onSwipedRight: () => onSwipe(null),
    trackMouse: false
  });

  const handleCardClick = () => {
    if (selectionMode) {
      onToggleSelect(transaction.id);
    } else if (isFromTrip && (transaction as any).tripId) {
      navigate(`/trips/${(transaction as any).tripId}`);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="relative mb-2"
    >
      <div {...handlers} className="relative">
        <motion.div
          animate={{ x: isSwiped ? -80 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={`bg-white dark:bg-gray-800 rounded-xl p-2.5 flex items-center justify-between relative z-10 ${isSelected
            ? 'border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : isFromTrip
              ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors'
              : ''
            }`}
          onPointerDown={() => onLongPressStart(transaction.id)}
          onPointerUp={onLongPressEnd}
          onPointerLeave={onLongPressEnd}
          onClick={handleCardClick}
        >
          {selectionMode && (
            <div className="mr-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${isSelected
                ? 'bg-blue-500 border-blue-500'
                : 'border-gray-300 dark:border-gray-600'
                }`}>
                {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
              </div>
            </div>
          )}
          <div className="flex items-center space-x-2 flex-1">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${transaction.type === 'income'
              ? 'bg-green-50 dark:bg-green-900/30'
              : transaction.type === 'debt'
                ? (transaction.category === 'Debt Paid' || transaction.debtType === 'settlement_out' || (transaction.debtType === 'borrowed' && transaction.debtStatus === 'settled'))
                  ? 'bg-red-50 dark:bg-red-900/30'
                  : (transaction.category === 'Debt Received' || transaction.debtType === 'settlement_in' || (transaction.debtType === 'lent' && transaction.debtStatus === 'settled'))
                    ? 'bg-green-50 dark:bg-green-900/30'
                    : 'bg-amber-50 dark:bg-amber-900/30'
                : transaction.type === 'transfer'
                  ? (transaction.transferFrom === 'secret_vault'
                    ? 'bg-green-50 dark:bg-green-900/30' // From Vault (Inflow)
                    : transaction.transferTo === 'secret_vault'
                      ? 'bg-red-50 dark:bg-red-900/30' // To Vault (Outflow)
                      : 'bg-blue-50 dark:bg-blue-900/30') // Standard Transfer
                  : 'bg-red-50 dark:bg-red-900/30'
              }`}>
              {transaction.type === 'income' ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : transaction.type === 'debt' ? (
                (transaction.category === 'Debt Paid' || transaction.debtType === 'settlement_out' || (transaction.debtType === 'borrowed' && transaction.debtStatus === 'settled')) ? (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                ) : (transaction.category === 'Debt Received' || transaction.debtType === 'settlement_in' || (transaction.debtType === 'lent' && transaction.debtStatus === 'settled')) ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <HandCoins className="w-4 h-4 text-amber-500" />
                )
              ) : transaction.type === 'transfer' ? (
                <ArrowRightLeft className={`w-4 h-4 ${transaction.transferFrom === 'secret_vault' ? 'text-green-500' :
                  transaction.transferTo === 'secret_vault' ? 'text-red-500' :
                    'text-blue-500'
                  }`} />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
            </div>
            <div>
              <p className="font-medium text-[15px] text-gray-900 dark:text-white">
                {transaction.description || (
                  transaction.type === 'income' ? 'Income' :
                    transaction.type === 'debt' ? (
                      transaction.debtType === 'lent' ? `Lent to ${transaction.borrowerName}` :
                        transaction.debtType === 'borrowed' ? `Borrowed from ${transaction.lenderName}` :
                          transaction.debtType === 'settlement_in' ? `Received from ${transaction.borrowerName}` :
                            transaction.debtType === 'settlement_out' ? `Paid to ${transaction.lenderName}` :
                              'Debt Transaction'
                    ) : transaction.type === 'transfer' ? (
                      transaction.transferFrom === 'secret_vault' ? 'Transfer from Secret Vault' :
                        transaction.transferTo === 'secret_vault' ? 'Transfer to Secret Vault' :
                          `Transfer to ${transaction.transferTo?.toUpperCase()}`
                    ) : 'Expense'
                )}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                {new Date(transaction.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} • {transaction.paymentMethod || 'Cash'}
                {transaction.type === 'debt' && (
                  <>
                    <span className="mx-0.5">•</span>
                    {(() => {
                      const settledSoFar = (transaction as any).settledAmount || 0;
                      const pendingAmt = Math.max(0, transaction.amount - settledSoFar);
                      const isSettled = transaction.debtStatus === 'settled' || pendingAmt < 0.1;

                      if (isSettled) {
                        return (
                          <span className="text-green-500 flex items-center gap-0.5 font-bold">
                            <CheckCircle className="w-3 h-3" /> Settled
                          </span>
                        );
                      }

                      return (
                        <span className="text-amber-500 flex items-center gap-0.5 font-bold">
                          <Clock className="w-3 h-3" />
                          {settledSoFar > 0
                            ? `Pending (₹${pendingAmt.toLocaleString()} left)`
                            : 'Pending'}
                        </span>
                      );
                    })()}
                  </>
                )}
                {isFromTrip && <span className="ml-1 text-blue-500 font-semibold">• Tap to view</span>}
              </p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-0.5">
            <span className={`font-bold text-sm ${transaction.type === 'income'
              ? 'text-green-500'
              : transaction.type === 'debt'
                ? 'text-amber-500'
                : transaction.type === 'transfer'
                  ? 'text-blue-500'
                  : 'text-red-500'
              }`}>
              {(() => {
                if (transaction.type === 'income') return '+';
                if (transaction.type === 'debt') {
                  if (transaction.debtType === 'settlement_in') return '+';
                  if (transaction.debtType === 'settlement_out') return '-';
                  if (transaction.debtType === 'borrowed') {
                    return transaction.debtStatus === 'settled' ? '-' : '+';
                  }
                  if (transaction.debtType === 'lent') {
                    return transaction.debtStatus === 'settled' ? '+' : '-';
                  }
                  return '';
                }
                if (transaction.type === 'transfer') {
                  if (transaction.transferFrom === 'secret_vault') return '+';
                  if (transaction.transferTo === 'secret_vault') return '-';
                  return '';
                }
                return '-';
              })()}₹{transaction.amount.toLocaleString()}
            </span>
            {runningBalance !== undefined && (
              <span className={`text-xs font-medium ${transaction.type === 'transfer' ? 'text-blue-400' : 'text-gray-400'}`}>
                ₹{runningBalance.toLocaleString()}
              </span>
            )}
            {!selectionMode && (
              <SyncStatusIcon status={status as any} size={10} showTooltip={false} />
            )}
          </div>
        </motion.div>

        {isSwiped && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => onDelete(transaction.id)}
            className="absolute right-0 top-0 bottom-0 w-20 bg-red-500 rounded-r-xl flex items-center justify-center"
          >
            <Trash2 className="w-5 h-5 text-white" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
});

TransactionCard.displayName = 'TransactionCard';
