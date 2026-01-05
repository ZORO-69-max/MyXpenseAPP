import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Minus,
  Shield,
  ShieldCheck,
  ArrowUpCircle,
  ArrowDownCircle,
  Check,
  Wallet,
  Clock,
  ChevronDown,
  TrendingUp
} from 'lucide-react';
import type { VaultTransaction } from '../utils/db';

interface SecretVaultDashboardProps {
  vaultBalance: number;
  vaultHistory: VaultTransaction[];
  totalBalance: number;
  onAddMoney: (amount: number, note: string) => void;
  onWithdrawMoney: (amount: number, note: string) => void;
  onClose: () => void;
}

const SecretVaultDashboard = ({
  vaultBalance,
  vaultHistory,
  totalBalance,
  onAddMoney,
  onWithdrawMoney,
  onClose
}: SecretVaultDashboardProps) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const currency = localStorage.getItem('myxpense_currency') || 'INR';
  const currencySymbols: { [key: string]: string } = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£'
  };
  const symbol = currencySymbols[currency] || '₹';

  const handleAdd = () => {
    const amt = parseFloat(amount);
    if (amt && amt > 0) {
      onAddMoney(amt, note || 'Added to vault');
      setAmount('');
      setNote('');
      setShowAddModal(false);
      setSuccessMessage(`+${symbol}${amt.toLocaleString()} added to vault!`);
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 2000);
    }
  };

  const handleWithdraw = () => {
    const amt = parseFloat(amount);
    if (amt && amt > 0 && amt <= vaultBalance) {
      onWithdrawMoney(amt, note || 'Withdrawn from vault');
      setAmount('');
      setNote('');
      setShowWithdrawModal(false);
      setSuccessMessage(`-${symbol}${amt.toLocaleString()} withdrawn from vault!`);
      setShowSuccessAnimation(true);
      setTimeout(() => setShowSuccessAnimation(false), 2000);
    }
  };

  const combinedBalance = totalBalance + vaultBalance;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-md" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl"
      >
        <AnimatePresence>
          {showSuccessAnimation && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-500/90 backdrop-blur-sm text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-full shadow-lg flex items-center space-x-2"
            >
              <Check className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-medium text-sm sm:text-base">{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 p-4 sm:p-6 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />

          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="absolute top-2 right-2 sm:top-3 sm:right-3 p-3 sm:p-4 min-w-12 min-h-12 sm:min-w-14 sm:min-h-14 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors z-30 cursor-pointer"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-white/90" />
          </button>

          <div className="relative z-10 flex items-center space-x-3 sm:space-x-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/15 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center border border-white/20">
              <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">Secure Vault</h2>
              <div className="flex items-center space-x-1.5 text-white/70 text-xs sm:text-sm">
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Protected Savings</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto max-h-[calc(90vh-120px)]">
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="relative rounded-xl sm:rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-slate-700/50 to-slate-800/50 backdrop-blur-sm border border-slate-600/30 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                    <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
                  </div>
                  <p className="text-slate-400 text-xs sm:text-sm font-medium uppercase tracking-wider">Vault Balance</p>
                </div>
              </div>

              <motion.p
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="text-3xl sm:text-4xl font-bold text-white mb-4"
              >
                {symbol}{vaultBalance.toLocaleString()}
              </motion.p>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 p-3 bg-slate-800/60 rounded-xl border border-slate-600/20">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs sm:text-sm text-slate-300">Total Net Worth</span>
                </div>
                <span className="text-sm sm:text-base font-semibold text-white">{symbol}{combinedBalance.toLocaleString()}</span>
              </div>

              <p className="text-xs text-slate-500 text-center mt-2">
                Balance: {symbol}{totalBalance.toLocaleString()} + Vault: {symbol}{vaultBalance.toLocaleString()}
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowAddModal(true)}
              className="relative bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold py-3.5 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span className="text-sm sm:text-base">Deposit</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowWithdrawModal(true)}
              className="relative bg-gradient-to-br from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white font-semibold py-3.5 sm:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl shadow-lg transition-all flex items-center justify-center space-x-2 border border-slate-500/30"
            >
              <Minus className="w-5 h-5" />
              <span className="text-sm sm:text-base">Withdraw</span>
            </motion.button>
          </div>

          <motion.button
            whileTap={{ scale: 0.99 }}
            onClick={() => setShowHistory(!showHistory)}
            className="w-full bg-slate-800/50 hover:bg-slate-700/50 text-white font-medium py-3 sm:py-3.5 px-4 sm:px-5 rounded-xl sm:rounded-2xl transition-all flex items-center justify-between border border-slate-700/50"
          >
            <div className="flex items-center space-x-2.5">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
              <span className="text-sm sm:text-base">Transaction History</span>
            </div>
            <motion.div
              animate={{ rotate: showHistory ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
            </motion.div>
          </motion.button>

          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 max-h-56 sm:max-h-64 overflow-y-auto pr-1">
                  {vaultHistory.length === 0 ? (
                    <div className="text-center py-6 sm:py-8">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500" />
                      </div>
                      <p className="text-slate-500 text-sm sm:text-base">No transactions yet</p>
                    </div>
                  ) : (
                    vaultHistory.slice().reverse().map((transaction, index) => (
                      <motion.div
                        key={transaction.id}
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between p-3 sm:p-3.5 bg-slate-800/40 hover:bg-slate-800/60 rounded-xl border border-slate-700/30 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          {transaction.type === 'add' ? (
                            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-500/15 rounded-xl flex items-center justify-center">
                              <ArrowUpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                            </div>
                          ) : (
                            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-rose-500/15 rounded-xl flex items-center justify-center">
                              <ArrowDownCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-white text-sm sm:text-base">
                              {transaction.note || (transaction.type === 'add' ? 'Deposit' : 'Withdrawal')}
                            </p>
                            <p className="text-xs text-slate-500">
                              {new Date(transaction.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <p className={`font-semibold text-sm sm:text-base ${transaction.type === 'add'
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                          }`}>
                          {transaction.type === 'add' ? '+' : '-'}{symbol}{transaction.amount.toLocaleString()}
                        </p>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-800 border border-slate-700/50 rounded-2xl p-5 sm:p-6 w-full max-w-sm shadow-2xl"
            >
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center space-x-2.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <Plus className="w-5 h-5 text-emerald-400" />
                </div>
                <span>Add to Vault</span>
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-700/50 text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Note (optional)
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g., Monthly savings"
                    className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-700/50 text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
                <div className="flex space-x-3 pt-2">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-3 px-4 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={!amount || parseFloat(amount) <= 0}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-600 disabled:text-slate-400 text-white font-semibold py-3 px-4 rounded-xl transition-all disabled:cursor-not-allowed"
                  >
                    Deposit
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showWithdrawModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowWithdrawModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-800 border border-slate-700/50 rounded-2xl p-5 sm:p-6 w-full max-w-sm shadow-2xl"
            >
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center space-x-2.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <Minus className="w-5 h-5 text-orange-300" />
                </div>
                <span>Withdraw Funds</span>
              </h3>
              <div className="bg-slate-700/40 border border-slate-600/30 rounded-xl p-3 mb-4 flex items-center justify-between">
                <span className="text-slate-400 text-sm">Available Balance</span>
                <span className="text-white font-semibold">{symbol}{vaultBalance.toLocaleString()}</span>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-700/50 text-white placeholder-slate-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Note (optional)
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g., Emergency expense"
                    className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-700/50 text-white placeholder-slate-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </div>
                <div className="flex space-x-3 pt-2">
                  <button
                    onClick={() => setShowWithdrawModal(false)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-3 px-4 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleWithdraw}
                    disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > vaultBalance}
                    className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:bg-slate-600 disabled:text-slate-400 text-white font-semibold py-3 px-4 rounded-xl transition-all disabled:cursor-not-allowed"
                  >
                    Withdraw
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SecretVaultDashboard;
