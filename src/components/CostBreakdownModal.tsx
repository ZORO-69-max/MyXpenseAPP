import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Info } from 'lucide-react';
import type { Trip, TripExpense } from '../types';
import { calculateSettlements, generateCostBreakdown, type CostBreakdownItem } from '../utils/minCashFlow';

interface CostBreakdownModalProps {
    isOpen: boolean;
    onClose: () => void;
    trip: Trip;
    expenses: TripExpense[];
}

const CostBreakdownModal = ({ isOpen, onClose, trip, expenses }: CostBreakdownModalProps) => {
    const [expandedParticipant, setExpandedParticipant] = useState<string | null>(null);

    if (!isOpen) return null;

    const { balances, totalExpenses } = calculateSettlements(trip, expenses);
    const breakdown = generateCostBreakdown(trip, expenses, balances);

    const toggleExpand = (participantId: string) => {
        setExpandedParticipant(expandedParticipant === participantId ? null : participantId);
    };

    // Calculate max values for bar chart scaling
    const maxAmount = Math.max(
        ...breakdown.map(b => Math.max(b.totalPaid, b.totalConsumed)),
        1
    );

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-4 flex items-center justify-between z-10">
                    <div>
                        <h2 className="text-xl font-bold text-white">Cost Breakdown</h2>
                        <p className="text-sm text-white/80">Who Paid vs Who Consumed</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* Summary Card */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total Trip Expenses</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{totalExpenses.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Per Person (Equal)</p>
                            <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                                ₹{(totalExpenses / trip.participants.length).toFixed(2)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Breakdown List */}
                <div className="overflow-y-auto max-h-[60vh] px-6 py-4 space-y-4">
                    {breakdown.map((item: CostBreakdownItem) => (
                        <div key={item.participant.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl overflow-hidden">
                            {/* Main Row */}
                            <button
                                onClick={() => toggleExpand(item.participant.id)}
                                className="w-full p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white font-bold">
                                        {item.participant.name[0].toUpperCase()}
                                    </div>
                                    <div className="text-left">
                                        <p className="font-medium text-gray-900 dark:text-white">
                                            {item.participant.name}
                                            {item.participant.isCurrentUser && <span className="text-xs text-blue-500 ml-1">(Me)</span>}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className={`flex items-center ${item.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {item.netBalance >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                                                {item.netBalance >= 0 ? 'Gets back' : 'Owes'}: ₹{Math.abs(item.netBalance).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {item.notes.length > 0 && (
                                        <Info className="w-4 h-4 text-amber-500" />
                                    )}
                                    {expandedParticipant === item.participant.id ? (
                                        <ChevronUp className="w-5 h-5 text-gray-400" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                    )}
                                </div>
                            </button>

                            {/* Expanded Content */}
                            <AnimatePresence>
                                {expandedParticipant === item.participant.id && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-4 pb-4 space-y-4">
                                            {/* Bar Chart */}
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 w-20">Paid</span>
                                                    <div className="flex-1 h-6 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-end pr-2"
                                                            style={{ width: `${(item.totalPaid / maxAmount) * 100}%` }}
                                                        >
                                                            <span className="text-xs text-white font-medium">₹{item.totalPaid.toFixed(0)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 w-20">Consumed</span>
                                                    <div className="flex-1 h-6 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full flex items-center justify-end pr-2"
                                                            style={{ width: `${(item.totalConsumed / maxAmount) * 100}%` }}
                                                        >
                                                            <span className="text-xs text-white font-medium">₹{item.totalConsumed.toFixed(0)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Stats */}
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                                                    <p className="text-xs text-green-600 dark:text-green-400">Total Paid</p>
                                                    <p className="font-bold text-green-700 dark:text-green-300">₹{item.totalPaid.toFixed(2)}</p>
                                                </div>
                                                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                                                    <p className="text-xs text-red-600 dark:text-red-400">Actual Share</p>
                                                    <p className="font-bold text-red-700 dark:text-red-300">₹{item.totalConsumed.toFixed(2)}</p>
                                                </div>
                                            </div>

                                            {/* Notes */}
                                            {item.notes.length > 0 && (
                                                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                                                    <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-2">Notes</p>
                                                    <ul className="space-y-1">
                                                        {item.notes.map((note, idx) => (
                                                            <li key={idx} className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1">
                                                                <span className="mt-1">•</span>
                                                                <span>{note}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>

                {/* Legend - Fixed Bottom Corners */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 rounded-b-3xl">
                    <div className="flex justify-center gap-6 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-400 to-green-600" />
                            <span>Amount Paid</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-red-400 to-red-600" />
                            <span>Amount Consumed</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default CostBreakdownModal;
