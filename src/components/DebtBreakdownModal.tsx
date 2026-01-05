import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowUpRight, ArrowDownLeft, Clock, CreditCard, Plane } from 'lucide-react';

interface DebtBreakdownModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    type: 'lent' | 'borrowed';
    transactions: any[];
    onSettle: (transaction: any) => void;
    onCardClick?: (transaction: any) => void;
}

const DebtBreakdownModal = ({ isOpen, onClose, title, type, transactions, onSettle, onCardClick }: DebtBreakdownModalProps) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    const pendingTransactions = transactions.filter(t => {
        const settledSoFar = t.settledAmount || 0;
        const pendingAmt = Math.max(0, t.amount - settledSoFar);
        return t.debtStatus === 'pending' && pendingAmt > 0.1;
    });
    const settledTransactions = transactions.filter(t => {
        const settledSoFar = t.settledAmount || 0;
        const pendingAmt = Math.max(0, t.amount - settledSoFar);
        return t.debtStatus === 'settled' || (t.debtStatus === 'pending' && pendingAmt <= 0.1);
    });

    // Calculate pending amounts (original amount minus any partial settlements)
    const totalAmount = pendingTransactions.reduce((sum, t) => {
        const settledSoFar = t.settledAmount || 0;
        return sum + Math.max(0, t.amount - settledSoFar);
    }, 0);

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };



    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        ref={modalRef}
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
                    >
                        {/* Header */}
                        <div className={`p-6 ${type === 'lent' ? 'bg-emerald-500' : 'bg-rose-500'} text-white`}>
                            <h2 className="text-xl font-bold mb-4">{title}</h2>
                            <div className="flex items-baseline space-x-1">
                                <span className="text-3xl font-bold">₹{totalAmount.toLocaleString()}</span>
                                <span className="text-sm opacity-90">total pending</span>
                            </div>
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Transaction List */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900/50">
                            {pendingTransactions.length === 0 ? (
                                <div className="text-center py-10 text-gray-500">
                                    <p>No pending debts in this category.</p>
                                </div>
                            ) : (
                                pendingTransactions.map((t) => {
                                    const isTripSettlement = t.isTripSettlement || t.tripId;

                                    return (
                                        <div
                                            key={t.id}
                                            onClick={() => {
                                                if (isTripSettlement && onCardClick) {
                                                    onClose();
                                                    onCardClick(t);
                                                }
                                            }}
                                            className={`bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between ${isTripSettlement && onCardClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors' : ''}`}
                                        >
                                            <div className="flex items-center space-x-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isTripSettlement
                                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                                                    : type === 'lent'
                                                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                                                        : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600'
                                                    }`}>
                                                    {isTripSettlement ? (
                                                        <Plane className="w-6 h-6" />
                                                    ) : (
                                                        type === 'lent' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownLeft className="w-6 h-6" />
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-900 dark:text-white text-base">
                                                        {type === 'lent' ? t.borrowerName : t.lenderName}
                                                    </h4>
                                                    <div className="flex flex-col gap-0.5">
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                                            <Clock className="w-3 h-3 mr-1" />
                                                            {formatDate(t.date)}
                                                        </p>
                                                        {isTripSettlement && (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 w-fit mt-0.5">
                                                                🌍 Trip: {t.description?.replace('Trip: ', '') || 'Unknown'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                {/* Show pending amount (original - settled) */}
                                                {(() => {
                                                    const settledSoFar = t.settledAmount || 0;
                                                    const pendingAmt = Math.max(0, t.amount - settledSoFar);
                                                    return (
                                                        <p className={`font-bold text-base mb-1 ${type === 'lent' ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'}`}>
                                                            ₹{pendingAmt.toLocaleString()}
                                                            {settledSoFar > 0 && (
                                                                <span className="text-xs font-normal text-gray-400 ml-1">
                                                                    (of ₹{t.amount.toLocaleString()})
                                                                </span>
                                                            )}
                                                        </p>
                                                    );
                                                })()}
                                                <button
                                                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline px-2 py-1 -mr-2"
                                                    onClick={(e) => {
                                                        e.stopPropagation(); // Prevent card click
                                                        onClose();
                                                        onSettle(t);
                                                    }}
                                                >
                                                    Settle
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}

                            {/* History / Settled Section */}
                            {settledTransactions.length > 0 && (
                                <>
                                    <div className="pt-4 pb-2 border-t border-gray-200 dark:border-gray-700 mt-4">
                                        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider pl-1">
                                            Completed Settlements
                                        </h3>
                                    </div>
                                    {settledTransactions.map((t) => {
                                        const isTripSettlement = t.category === 'Trip Settlement' || t.description?.includes('Trip:');
                                        return (
                                            <div
                                                key={t.id}
                                                className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-start justify-between opacity-80"
                                            >
                                                <div className="flex items-start space-x-3">
                                                    <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-500 mt-1">
                                                        {isTripSettlement ? (
                                                            <Plane className="w-5 h-5" />
                                                        ) : (
                                                            <CreditCard className="w-5 h-5" />
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col gap-0.5">
                                                        <h4 className="font-semibold text-gray-700 dark:text-gray-300 text-sm">
                                                            {type === 'lent' ? t.borrowerName : t.lenderName}
                                                        </h4>
                                                        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                                                            <span className="flex items-center">
                                                                <Clock className="w-3 h-3 mr-1" />
                                                                {formatDate(t.date)}
                                                            </span>
                                                        </div>
                                                        <div className="mt-1.5 self-start inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600">
                                                            {isTripSettlement ? (
                                                                <>🌍 {t.description?.includes('Trip:') ? t.description.split(': ')[1] : 'Trip Settlement'}</>
                                                            ) : 'Settled'}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-right flex flex-col items-end gap-1">
                                                    <p className="font-bold text-sm text-gray-500 dark:text-gray-400 line-through">
                                                        ₹{t.amount.toLocaleString()}
                                                    </p>
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${type === 'lent' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                                                        {type === 'lent' ? 'Received' : 'Paid'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default DebtBreakdownModal;
