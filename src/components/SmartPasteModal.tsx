import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Clipboard, CheckCircle } from 'lucide-react';
import { parseSMS, type ParsedTransaction } from '../utils/smsParser';

interface SmartPasteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (transactions: ParsedTransaction[]) => Promise<void>;
}

export default function SmartPasteModal({ isOpen, onClose, onSave }: SmartPasteModalProps) {
    const [step, setStep] = useState<'input' | 'review'>('input');
    const [text, setText] = useState('');
    const [parsedItems, setParsedItems] = useState<ParsedTransaction[]>([]);

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setStep('input');
            setText('');
            setParsedItems([]);
        }
    }, [isOpen]);

    const handleParse = () => {
        const items = parseSMS(text);
        if (items.length > 0) {
            setParsedItems(items);
            setStep('review');
        } else {
            // TODO: Show toast error "No transactions found"
            alert("No valid transactions found in text.");
        }
    };

    const updateItem = (id: string, updates: Partial<ParsedTransaction>) => {
        setParsedItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    const removeItem = (id: string) => {
        setParsedItems(prev => prev.filter(item => item.id !== id));
    };

    const handleSaveAll = async () => {
        await onSave(parsedItems);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl"
                >
                    {/* Header */}
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Clipboard className="w-5 h-5 text-blue-500" />
                            Smart SMS Parser
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {step === 'input' ? (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Paste your SMS text below. We'll automatically extract transaction details for you to review.
                                </p>
                                <textarea
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    placeholder="Paste SMS here... e.g. 'Rs. 200 paid to UBER on 12/01/26'"
                                    className="w-full h-40 p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono text-sm"
                                />
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleParse}
                                        disabled={!text.trim()}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Parse Text <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-500">Found {parsedItems.length} transactions</span>
                                    <button
                                        onClick={() => setStep('input')}
                                        className="text-xs text-blue-500 hover:underline"
                                    >
                                        Paste different text
                                    </button>
                                </div>

                                {parsedItems.map((item) => (
                                    <ReviewCard
                                        key={item.id}
                                        item={item}
                                        onChange={(updates) => updateItem(item.id, updates)}
                                        onDelete={() => removeItem(item.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {step === 'review' && (
                        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 bg-gray-50/50 dark:bg-gray-800/50">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveAll}
                                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl font-medium flex items-center gap-2"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Confirm & Save ({parsedItems.length})
                            </button>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// Sub-component for individual review card
const ReviewCard = ({
    item,
    onChange,
    onDelete,
}: {
    item: ParsedTransaction,
    onChange: (u: Partial<ParsedTransaction>) => void,
    onDelete: () => void,
}) => {
    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm relative group">
            <button
                onClick={onDelete}
                className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <X className="w-4 h-4" />
            </button>

            {/* Type Toggle */}
            <div className="flex gap-2 mb-4">
                {(['income', 'expense', 'debt'] as const).map((t) => (
                    <button
                        key={t}
                        onClick={() => onChange({ type: t })}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold uppercase tracking-wide border ${item.type === t
                            ? t === 'income'
                                ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                                : t === 'expense'
                                    ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                                    : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                            : 'bg-transparent text-gray-500 border-transparent hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Amount */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Amount</label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                        <input
                            type="number"
                            value={item.amount}
                            onChange={(e) => onChange({ amount: parseFloat(e.target.value) || 0 })}
                            className="w-full pl-7 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                {/* Date */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                    <input
                        type="date"
                        value={item.date.toISOString().split('T')[0]}
                        onChange={(e) => onChange({ date: new Date(e.target.value) })}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            {/* Dynamic Fields based on Type */}
            <div className="mt-3 space-y-3">

                {/* Entity / Description */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                        {item.type === 'expense' ? 'Paid To' : item.type === 'income' ? 'Received From' : 'Participant'}
                    </label>
                    <input
                        type="text"
                        value={item.entity}
                        onChange={(e) => onChange({ entity: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder={item.type === 'expense' ? 'Merchant Name' : 'Sender Name'}
                    />
                </div>

                {item.type === 'expense' && (
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                        <select
                            value={item.category || 'Food'}
                            onChange={(e) => onChange({ category: e.target.value })}
                            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
                        >
                            <option value="Food">Food</option>
                            <option value="Transport">Transport</option>
                            <option value="Shopping">Shopping</option>
                            <option value="Entertainment">Entertainment</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                )}

                {item.type === 'debt' && (
                    <div className="flex bg-blue-50 dark:bg-blue-900/10 p-2 rounded-lg gap-2">
                        <button
                            onClick={() => onChange({ debtType: 'lent' })}
                            className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors ${item.debtType === 'lent' ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-300' : 'text-gray-500 hover:bg-white/50'}`}
                        >
                            I Lent (They owe me)
                        </button>
                        <button
                            onClick={() => onChange({ debtType: 'borrowed' })}
                            className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors ${item.debtType === 'borrowed' ? 'bg-white dark:bg-gray-700 shadow text-amber-600 dark:text-amber-300' : 'text-gray-500 hover:bg-white/50'}`}
                        >
                            I Borrowed (I owe them)
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-400 italic truncate max-w-full">
                    Orig: "{item.originalText}"
                </p>
            </div>
        </div>
    );
};
