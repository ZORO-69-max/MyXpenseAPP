import { useState, useEffect } from 'react';
import { X, Calendar, User, Wallet, ArrowRightLeft, Settings, Clock, History, CheckCircle2, ArrowDownLeft, ArrowUpRight, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTransactions } from '../hooks/useFirestoreSync';
import { useAuth } from '../context/AuthContext';
import type { Transaction } from '../types';
import { getNotificationPreferences, saveNotificationPreferences, type NotificationPreferences } from '../utils/db';

interface BorrowManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Tab = 'lend' | 'borrow' | 'records' | 'settings';
type RecordFilter = 'all' | 'active' | 'settled';

const BorrowManagerModal = ({ isOpen, onClose }: BorrowManagerModalProps) => {
    const { addTransaction, transactions, updateTransaction } = useTransactions();
    const { currentUser, userProfile } = useAuth();

    const [activeTab, setActiveTab] = useState<Tab>('lend');

    // Form States
    const [amount, setAmount] = useState('');
    const [personName, setPersonName] = useState('');
    const [description, setDescription] = useState(''); // New State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState('UPI');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Settings State
    const [reminderDays, setReminderDays] = useState(7);
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    // Records State
    const [recordFilter, setRecordFilter] = useState<RecordFilter>('active');

    // Load Settings
    useEffect(() => {
        const loadSettings = async () => {
            if (userProfile?.uid) {
                const prefs = await getNotificationPreferences(userProfile.uid);
                if (prefs?.settlementReminderDays) {
                    setReminderDays(prefs.settlementReminderDays);
                }
            }
        };
        if (isOpen) loadSettings();
    }, [isOpen, userProfile?.uid]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !personName || !currentUser) return;

        setIsSubmitting(true);
        try {
            const isLending = activeTab === 'lend';

            await addTransaction({
                id: `debt_${Date.now()}`,
                userId: currentUser.uid,
                type: 'debt',
                debtType: isLending ? 'lent' : 'borrowed',
                amount: parseFloat(amount),
                category: 'Debt',
                description: description || (isLending ? `Lent to ${personName}` : `Borrowed from ${personName}`),
                date: new Date(date),
                paymentMethod,
                borrowerName: isLending ? personName : undefined,
                lenderName: !isLending ? personName : undefined,
                debtStatus: 'pending',
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            // Reset form
            // Reset form
            setAmount('');
            setPersonName('');
            setDescription('');
            setDate(new Date().toISOString().split('T')[0]);
            setActiveTab('records'); // Switch to records view
        } catch (error) {
            console.error('Error adding debt record:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSettle = async (transaction: Transaction) => {
        if (!currentUser || !transaction.id) return;

        try {
            // Mark original debt as settled
            // NOTE: We only update the debt status here. 
            // The balance calculation in finance.ts handles settled debts correctly.
            // We do NOT create a separate settlement_in/settlement_out transaction
            // to avoid duplication - the debt being marked as 'settled' is sufficient.
            await updateTransaction(transaction.id, {
                debtStatus: 'settled',
                settledAmount: transaction.amount, // Mark fully settled
                updatedAt: new Date()
            });

            // NOTE: Removed duplicate addTransaction() call that was creating
            // settlement_in/settlement_out transactions and causing double-counting.
            // The debt status change to 'settled' is sufficient for balance calculation.

        } catch (error) {
            console.error('Error settling debt:', error);
        }
    };

    const handleSaveSettings = async () => {
        if (!userProfile?.uid) return;
        setIsSavingSettings(true);
        try {
            const existing = await getNotificationPreferences(userProfile.uid);
            const newPrefs: NotificationPreferences = {
                id: existing?.id || `prefs_${userProfile.uid}`,
                userId: userProfile.uid,
                daysOfWeek: existing?.daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
                reminderTime: existing?.reminderTime || '09:00',
                enabled: existing?.enabled ?? true,
                settlementReminderDays: reminderDays,
                createdAt: existing?.createdAt || new Date(),
                updatedAt: new Date()
            };
            await saveNotificationPreferences(newPrefs);
            onClose(); // Close modal on save? Or just show toast? Closing for now.
        } catch (error) {
            console.error('Error saving settings:', error);
        } finally {
            setIsSavingSettings(false);
        }
    };

    const getFilteredRecords = () => {
        return transactions
            .filter(t => t.type === 'debt' && (t.debtType === 'lent' || t.debtType === 'borrowed'))
            .filter(t => {
                // Calculate remaining amount for this debt
                const settledAmount = (t as any).settledAmount || 0;
                const remainingAmount = t.amount - settledAmount;

                if (recordFilter === 'active') {
                    // Show as active if status is pending OR there's remaining amount
                    return t.debtStatus === 'pending' || remainingAmount > 0.01;
                }
                if (recordFilter === 'settled') {
                    // Fully settled: status is settled AND no remaining
                    return t.debtStatus === 'settled' && remainingAmount <= 0.01;
                }
                return true;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 font-sans"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col h-[600px] max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-4 shrink-0">
                            <div className="flex items-center justify-between text-white mb-4">
                                <div className="flex items-center gap-2">
                                    <ArrowRightLeft className="w-5 h-5" />
                                    <h2 className="text-lg font-bold">Debt Manager</h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setActiveTab('settings')} className="p-1.5 hover:bg-white/20 rounded-full transition-colors">
                                        <Settings className="w-5 h-5" />
                                    </button>
                                    <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-full transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-2 bg-white/20 p-1 rounded-xl">
                                <button
                                    onClick={() => setActiveTab('lend')}
                                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'lend'
                                        ? 'bg-white text-amber-600 shadow-md'
                                        : 'text-white hover:bg-white/20'
                                        }`}
                                >
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                    Lend (Give)
                                </button>
                                <button
                                    onClick={() => setActiveTab('borrow')}
                                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'borrow'
                                        ? 'bg-white text-amber-600 shadow-md'
                                        : 'text-white hover:bg-white/20'
                                        }`}
                                >
                                    <ArrowDownLeft className="w-3.5 h-3.5" />
                                    Borrow (Take)
                                </button>
                                <button
                                    onClick={() => setActiveTab('records')}
                                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${activeTab === 'records'
                                        ? 'bg-white text-amber-600 shadow-md'
                                        : 'text-white hover:bg-white/20'
                                        }`}
                                >
                                    <History className="w-3.5 h-3.5" />
                                    Records
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-5 overflow-y-auto grow">
                            {activeTab === 'settings' ? (
                                <div className="space-y-6">
                                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-amber-500" />
                                        Settlement Reminders
                                    </h3>

                                    <div className="space-y-3">
                                        <label className="text-sm text-gray-600 dark:text-gray-400">
                                            Remind me about pending settlements after:
                                        </label>
                                        <div className="flex gap-2">
                                            {[3, 7, 14, 30].map(days => (
                                                <button
                                                    key={days}
                                                    onClick={() => setReminderDays(days)}
                                                    className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${reminderDays === days
                                                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                                                        : 'border-transparent bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                                        }`}
                                                >
                                                    {days} Days
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-500 italic">
                                            You will receive a notification in the app bell icon.
                                        </p>
                                    </div>

                                    <div className="pt-4 border-t dark:border-gray-700">
                                        <button
                                            onClick={handleSaveSettings}
                                            disabled={isSavingSettings}
                                            className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:opacity-90 transition-opacity"
                                        >
                                            {isSavingSettings ? 'Saving...' : 'Save Settings'}
                                        </button>
                                    </div>
                                </div>
                            ) : activeTab === 'records' ? (
                                <div className="space-y-4">
                                    {/* Filters */}
                                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                        {['active', 'settled', 'all'].map((f) => (
                                            <button
                                                key={f}
                                                onClick={() => setRecordFilter(f as RecordFilter)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap capitalize transition-colors ${recordFilter === f
                                                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                                    }`}
                                            >
                                                {f} Records
                                            </button>
                                        ))}
                                    </div>

                                    <div className="space-y-3">
                                        {getFilteredRecords().length === 0 ? (
                                            <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                                                <p className="text-sm">No {recordFilter !== 'all' ? recordFilter : ''} debt records found.</p>
                                            </div>
                                        ) : (
                                            getFilteredRecords().map(record => (
                                                <div key={record.id} className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-between group">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${record.debtType === 'lent'
                                                            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600'
                                                            : 'bg-purple-100 dark:bg-purple-900/40 text-purple-600'
                                                            }`}>
                                                            {record.debtType === 'lent' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                {record.debtType === 'lent' ? record.borrowerName : record.lenderName}
                                                            </p>
                                                            <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                                                {new Date(record.date).toLocaleDateString()} • {record.debtType === 'lent' ? 'You Lent' : 'You Borrowed'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        {(() => {
                                                            const settledAmt = (record as any).settledAmount || 0;
                                                            const remainingAmt = record.amount - settledAmt;
                                                            const isFullySettled = record.debtStatus === 'settled' && remainingAmt <= 0.01;

                                                            return (
                                                                <>
                                                                    <p className={`font-bold text-sm ${record.debtType === 'lent' ? 'text-amber-600 dark:text-amber-500' : 'text-purple-600 dark:text-purple-400'}`}>
                                                                        ₹{remainingAmt > 0.01 ? remainingAmt.toLocaleString() : record.amount.toLocaleString()}
                                                                        {settledAmt > 0 && remainingAmt > 0.01 && (
                                                                            <span className="text-[10px] text-gray-400 font-normal ml-1">
                                                                                (of ₹{record.amount.toLocaleString()})
                                                                            </span>
                                                                        )}
                                                                    </p>
                                                                    {!isFullySettled && remainingAmt > 0.01 ? (
                                                                        <button
                                                                            onClick={() => handleSettle(record)}
                                                                            className="text-[10px] font-semibold text-blue-500 hover:underline cursor-pointer"
                                                                        >
                                                                            Mark Settled
                                                                        </button>
                                                                    ) : (
                                                                        <span className="text-[10px] font-medium text-green-500 flex items-center justify-end gap-1">
                                                                            <CheckCircle2 className="w-3 h-3" /> Settled
                                                                        </span>
                                                                    )}
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ) : (
                                /* Lend/Borrow Form */
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                                            {activeTab === 'lend' ? "Who is borrowing?" : "Who are you borrowing from?"}
                                        </label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                value={personName}
                                                onChange={(e) => setPersonName(e.target.value)}
                                                placeholder="Enter name (e.g., John)"
                                                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                                            Amount
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                                            <input
                                                type="number"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                placeholder="0"
                                                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-bold text-lg"
                                                required
                                                min="1"
                                                step="any"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                                            Description (Optional)
                                        </label>
                                        <div className="relative">
                                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder="What is this for?"
                                                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                                                Date
                                            </label>
                                            <div className="relative">
                                                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                                <input
                                                    type="date"
                                                    value={date}
                                                    onChange={(e) => setDate(e.target.value)}
                                                    className="w-full pl-8 pr-2 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">
                                                Method
                                            </label>
                                            <div className="relative">
                                                <Wallet className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                                <select
                                                    value={paymentMethod}
                                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                                    className="w-full pl-8 pr-2 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm font-medium appearance-none"
                                                >
                                                    <option value="UPI">UPI</option>
                                                    <option value="Cash">Cash</option>
                                                    <option value="Card">Card</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className={`w-full py-3 text-white rounded-xl font-bold shadow-lg transform active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 ${activeTab === 'lend'
                                            ? 'bg-amber-500 shadow-amber-500/30 hover:shadow-amber-500/40'
                                            : 'bg-purple-600 shadow-purple-600/30 hover:shadow-purple-600/40'
                                            }`}
                                    >
                                        {isSubmitting ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                {activeTab === 'lend' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                                                <span>{activeTab === 'lend' ? 'Confirm Lending' : 'Confirm Borrowing'}</span>
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default BorrowManagerModal;
