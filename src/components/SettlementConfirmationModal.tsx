import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Banknote, Smartphone, AlertCircle, Edit2, Wallet } from 'lucide-react';

interface SettlementConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: any;
    onConfirm: (data: SettlementData) => void;
}

export interface SettlementData {
    amount: number;
    paymentMethod: 'cash' | 'online' | 'hybrid';
    split?: {
        cash: number;
        online: number;
    };
}

const SettlementConfirmationModal = ({ isOpen, onClose, transaction, onConfirm }: SettlementConfirmationModalProps) => {
    const [amount, setAmount] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online' | 'hybrid'>('cash');
    const [hybridSplit, setHybridSplit] = useState({ cash: '', online: '' });

    // Calculate remaining amount (original - already settled)
    const originalAmount = transaction?.amount || 0;
    const alreadySettled = transaction?.settledAmount || 0;
    const remainingAmount = Math.max(0, originalAmount - alreadySettled);

    useEffect(() => {
        if (transaction) {
            // Auto-fill with REMAINING amount, not original
            setAmount(remainingAmount.toString());
            setPaymentMethod('cash'); // Default
            setHybridSplit({ cash: '', online: '' });
        }
    }, [transaction, isOpen, remainingAmount]);

    if (!transaction) return null;

    const totalAmount = parseFloat(amount) || 0;
    // Check if this is a partial payment of the REMAINING amount
    const isPartial = totalAmount < remainingAmount && totalAmount > 0;

    // Auto-calculate other half of hybrid split
    const handleHybridChange = (type: 'cash' | 'online', value: string) => {
        const valObj = { ...hybridSplit, [type]: value };
        const numVal = parseFloat(value) || 0;

        // Auto-fill other field
        const otherType = type === 'cash' ? 'online' : 'cash';
        const otherVal = Math.max(0, totalAmount - numVal).toFixed(2);

        // Only update if the sum doesn't exceed total (basic prevention)
        valObj[otherType] = otherVal;

        setHybridSplit(valObj);
    };

    const handleConfirm = () => {
        const data: SettlementData = {
            amount: totalAmount,
            paymentMethod,
            split: paymentMethod === 'hybrid' ? {
                cash: parseFloat(hybridSplit.cash) || 0,
                online: parseFloat(hybridSplit.online) || 0
            } : undefined
        };
        onConfirm(data);
    };

    const isValid = () => {
        if (totalAmount <= 0) return false;
        // Can't settle more than what's remaining
        if (totalAmount > remainingAmount + 0.01) return false;

        if (paymentMethod === 'hybrid') {
            const cash = parseFloat(hybridSplit.cash) || 0;
            const online = parseFloat(hybridSplit.online) || 0;
            return Math.abs((cash + online) - totalAmount) < 0.1;
        }
        return true;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 sm:p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Confirm Settlement</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {transaction.debtType === 'lent' ? 'Receiving from' : 'Paying to'} {transaction.debtType === 'lent' ? transaction.borrowerName : transaction.lenderName}
                                </p>
                            </div>
                            <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Amount Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Amount to Settle
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        className="w-full pl-8 pr-4 py-3 text-lg font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    {isPartial && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-amber-500 font-medium bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                                            Partial Payment
                                        </div>
                                    )}
                                </div>
                                {isPartial && (
                                    <p className="text-xs text-gray-500 mt-2 ml-1">
                                        Remaining debt: ₹{(remainingAmount - totalAmount).toLocaleString()} will stay pending.
                                    </p>
                                )}
                                {alreadySettled > 0 && (
                                    <p className="text-xs text-blue-500 mt-1 ml-1">
                                        Previously settled: ₹{alreadySettled.toLocaleString()} of ₹{originalAmount.toLocaleString()}
                                    </p>
                                )}
                            </div>

                            {/* Payment Method Selection */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                                    <Edit2 className="w-3 h-3 mr-1.5" />
                                    Select Payment Mode
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        onClick={() => setPaymentMethod('cash')}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${paymentMethod === 'cash'
                                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                            }`}
                                    >
                                        <Banknote className="w-6 h-6 mb-1" />
                                        <span className="text-xs font-semibold">Cash</span>
                                    </button>

                                    <button
                                        onClick={() => setPaymentMethod('online')}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${paymentMethod === 'online'
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                            }`}
                                    >
                                        <Smartphone className="w-6 h-6 mb-1" />
                                        <span className="text-xs font-semibold">UPI / Online</span>
                                    </button>

                                    <button
                                        onClick={() => setPaymentMethod('hybrid')}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${paymentMethod === 'hybrid'
                                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400'
                                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                            }`}
                                    >
                                        <Wallet className="w-6 h-6 mb-1" />
                                        <span className="text-xs font-semibold">Hybrid</span>
                                    </button>
                                </div>
                            </div>

                            {/* Hybrid Split Inputs */}
                            <AnimatePresence>
                                {paymentMethod === 'hybrid' && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-purple-50 dark:bg-purple-900/10 rounded-2xl p-4 space-y-3 overflow-hidden"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1">
                                                <label className="text-xs text-purple-700 dark:text-purple-300 font-medium mb-1 block">Cash Amount</label>
                                                <input
                                                    type="number"
                                                    value={hybridSplit.cash}
                                                    onChange={(e) => handleHybridChange('cash', e.target.value)}
                                                    className="w-full px-3 py-2 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-black text-sm"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-xs text-purple-700 dark:text-purple-300 font-medium mb-1 block">UPI Amount</label>
                                                <input
                                                    type="number"
                                                    value={hybridSplit.online}
                                                    onChange={(e) => handleHybridChange('online', e.target.value)}
                                                    className="w-full px-3 py-2 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-black text-sm"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                        {!isValid() && (
                                            <p className="text-xs text-red-500 flex items-center">
                                                <AlertCircle className="w-3 h-3 mr-1" />
                                                Total must match {totalAmount}
                                            </p>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Action Button */}
                            <button
                                onClick={handleConfirm}
                                disabled={!isValid()}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 disabled:opacity-50 disabled:shadow-none transition-all"
                            >
                                Confirm Settlement
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SettlementConfirmationModal;
