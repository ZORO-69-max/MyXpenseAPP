import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Calendar } from 'lucide-react';
import type { RecurringRule } from '../types';

interface DailyDigestModalProps {
    pendingRules: RecurringRule[];
    onConfirm: (confirmedItems: { ruleId: string; amount: number; note: string }[]) => void;
    onRemindLater: () => void;
}

const DailyDigestModal = ({ pendingRules, onConfirm, onRemindLater }: DailyDigestModalProps) => {
    const [items, setItems] = useState(
        pendingRules.map(rule => ({
            ruleId: rule.id,
            title: rule.title,
            amount: rule.baseAmount,
            category: rule.category,
            note: '',
            isSelected: true
        }))
    );

    const totalAmount = items
        .filter(item => item.isSelected)
        .reduce((sum, item) => sum + item.amount, 0);

    const handleConfirm = () => {
        const confirmed = items
            .filter(item => item.isSelected)
            .map(item => ({
                ruleId: item.ruleId,
                amount: item.amount,
                note: item.note
            }));
        onConfirm(confirmed);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-90" />
                    <h2 className="text-2xl font-bold">Daily Payments Review</h2>
                    <p className="text-blue-100 opacity-90 mt-1">
                        Good morning! You have {items.length} payments scheduled for today.
                    </p>
                </div>

                {/* List */}
                <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3 bg-gray-50 dark:bg-gray-900/50">
                    {items.map((item, index) => (
                        <motion.div
                            key={item.ruleId}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`p-4 rounded-xl border transition-all ${item.isSelected
                                ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm'
                                : 'bg-gray-100 dark:bg-gray-900 border-transparent opacity-60 grayscale'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <button
                                    onClick={() => setItems(items.map(i => i.ruleId === item.ruleId ? { ...i, isSelected: !i.isSelected } : i))}
                                    className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${item.isSelected
                                        ? 'bg-blue-500 border-blue-500 text-white'
                                        : 'border-gray-300 dark:border-gray-600 text-transparent'
                                        }`}
                                >
                                    <Check className="w-3 h-3" />
                                </button>

                                <div className="flex-1 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                                        <div className="flex items-center space-x-1">
                                            <span className="text-gray-500 dark:text-gray-400 text-sm">₹</span>
                                            <input
                                                type="number"
                                                value={item.amount}
                                                onChange={(e) => setItems(items.map(i => i.ruleId === item.ruleId ? { ...i, amount: parseFloat(e.target.value) || 0 } : i))}
                                                className="w-20 px-2 py-1 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-right font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm disabled:opacity-50"
                                                disabled={!item.isSelected}
                                            />
                                        </div>
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="Add a note... (optional)"
                                        value={item.note}
                                        onChange={(e) => setItems(items.map(i => i.ruleId === item.ruleId ? { ...i, note: e.target.value } : i))}
                                        className="w-full text-xs px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-transparent focus:bg-white dark:focus:bg-gray-800 focus:border-blue-200 focus:ring-0 transition-colors"
                                        disabled={!item.isSelected}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-3">
                    <div className="flex justify-between items-center text-sm font-medium">
                        <span className="text-gray-500 dark:text-gray-400">Total to Pay</span>
                        <span className="text-xl font-bold text-gray-900 dark:text-white">₹{totalAmount.toLocaleString()}</span>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onRemindLater}
                            className="flex-1 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Remind Later
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={items.filter(i => i.isSelected).length === 0}
                            className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:shadow-none"
                        >
                            Confirm & Add
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default DailyDigestModal;
