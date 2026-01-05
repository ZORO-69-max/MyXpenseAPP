import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, IndianRupee, Clock, ShoppingCart, Home as HomeIcon, Car, Utensils, Heart, Briefcase, Gift, Zap } from 'lucide-react';
import type { Transaction } from '../types';

interface DailyTransactionCardProps {
    selectedDate: Date | null;
    transactions: Transaction[];
}

const DailyTransactionCard = ({ selectedDate, transactions }: DailyTransactionCardProps) => {
    if (!selectedDate) {
        return (
            <div className="bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">Select a date to view transactions</p>
                </div>
            </div>
        );
    }

    const dayTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return (
            tDate.getDate() === selectedDate.getDate() &&
            tDate.getMonth() === selectedDate.getMonth() &&
            tDate.getFullYear() === selectedDate.getFullYear()
        );
    });

    const income = dayTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const expenses = dayTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const net = income - expenses;

    const formatDate = (date: Date) => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    };

    const formatTime = (date: Date) => {
        const d = new Date(date);
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const getCategoryIcon = (category: string) => {
        const icons: Record<string, any> = {
            'Food': Utensils,
            'Shopping': ShoppingCart,
            'Transportation': Car,
            'Transport': Car,
            'Housing': HomeIcon,
            'Entertainment': Gift,
            'Healthcare': Heart,
            'Health': Heart,
            'Utilities': Zap,
            'Salary': Briefcase,
            'Freelance': Briefcase,
            'Business': Briefcase,
        };

        const IconComponent = icons[category] || IndianRupee;
        return <IconComponent className="w-4 h-4" />;
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={selectedDate.toISOString()}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 text-white">
                    <h3 className="text-lg font-bold mb-1">{formatDate(selectedDate)}</h3>
                    <p className="text-sm text-white/80">{dayTransactions.length} transactions</p>
                </div>

                {/* Summary Cards */}
                <div className="p-3 grid grid-cols-3 gap-2">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-2 border border-green-200 dark:border-green-800/30">
                        <div className="flex flex-col xs:flex-row items-start xs:items-center gap-1.5 mb-1.5">
                            <div className="p-1 bg-green-500 rounded-md shrink-0">
                                <TrendingUp className="w-2.5 h-2.5 text-white" />
                            </div>
                            <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 truncate w-full">Income</span>
                        </div>
                        <p className="text-sm font-bold text-green-700 dark:text-green-300 truncate">₹{income.toFixed(0)}</p>
                    </div>

                    <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-xl p-2 border border-red-200 dark:border-red-800/30">
                        <div className="flex flex-col xs:flex-row items-start xs:items-center gap-1.5 mb-1.5">
                            <div className="p-1 bg-red-500 rounded-md shrink-0">
                                <TrendingDown className="w-2.5 h-2.5 text-white" />
                            </div>
                            <span className="text-[10px] font-semibold text-red-600 dark:text-red-400 truncate w-full">Expense</span>
                        </div>
                        <p className="text-sm font-bold text-red-700 dark:text-red-300 truncate">₹{expenses.toFixed(0)}</p>
                    </div>

                    <div className={`bg-gradient-to-br ${net >= 0 ? 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20' : 'from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20'} rounded-xl p-2 border ${net >= 0 ? 'border-blue-200 dark:border-blue-800/30' : 'border-orange-200 dark:border-orange-800/30'}`}>
                        <div className="flex flex-col xs:flex-row items-start xs:items-center gap-1.5 mb-1.5">
                            <div className={`p-1 ${net >= 0 ? 'bg-blue-500' : 'bg-orange-500'} rounded-md shrink-0`}>
                                <IndianRupee className="w-2.5 h-2.5 text-white" />
                            </div>
                            <span className={`text-[10px] font-semibold truncate w-full ${net >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>Net</span>
                        </div>
                        <p className={`text-sm font-bold truncate ${net >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>
                            {net >= 0 ? '+' : '-'}₹{Math.abs(net).toFixed(0)}
                        </p>
                    </div>
                </div>

                {/* Transactions List - Compact Style */}
                <div className="px-5 pb-5">
                    {dayTransactions.length === 0 ? (
                        <div className="text-center py-6">
                            <p className="text-gray-400 dark:text-gray-500 text-xs">No transactions on this day</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                            {dayTransactions.map((transaction) => (
                                <motion.div
                                    key={transaction.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`flex items-center justify-between p-2 rounded-xl transition-all hover:shadow-sm ${transaction.type === 'income'
                                        ? 'bg-white/60 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50 hover:border-green-200 dark:hover:border-green-800'
                                        : 'bg-white/60 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50 hover:border-red-200 dark:hover:border-red-800'
                                        }`}
                                >
                                    <div className="flex items-center gap-2.5 overflow-hidden">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${transaction.type === 'income'
                                            ? 'bg-gradient-to-br from-green-100 to-green-200 text-green-700 dark:from-green-900/30 dark:to-green-800/30 dark:text-green-400'
                                            : 'bg-gradient-to-br from-red-100 to-red-200 text-red-700 dark:from-red-900/30 dark:to-red-800/30 dark:text-red-400'
                                            }`}>
                                            {getCategoryIcon(transaction.category)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm text-gray-900 dark:text-white truncate font-medium">
                                                {transaction.description || transaction.category}
                                            </p>
                                            <p className="text-[10px] text-gray-400 flex items-center gap-1 font-medium">
                                                {transaction.category}
                                                <span className="w-0.5 h-0.5 rounded-full bg-gray-300"></span>
                                                {formatTime(transaction.date)}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`text-sm font-bold shrink-0 px-2 py-0.5 rounded-lg border ${transaction.type === 'income'
                                        ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/10'
                                        : 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/10'
                                        }`}>
                                        {transaction.type === 'income' ? '+' : '-'}₹{transaction.amount.toLocaleString()}
                                    </span>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default DailyTransactionCard;
