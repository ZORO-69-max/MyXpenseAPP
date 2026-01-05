import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { Transaction } from '../types';

interface AnalyticsCalendarProps {
    transactions: Transaction[];
}

const AnalyticsCalendar = ({ transactions }: AnalyticsCalendarProps) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState<{ date: string; transactions: Transaction[] } | null>(null);

    const daysInMonth = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const date = new Date(year, month, 1);
        const days = [];

        // Add empty slots for previous month
        for (let i = 0; i < date.getDay(); i++) {
            days.push(null);
        }

        // Add days
        while (date.getMonth() === month) {
            days.push(new Date(date));
            date.setDate(date.getDate() + 1);
        }

        return days;
    }, [currentDate]);

    const monthStats = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // Group transactions by day
        const dayStats = new Map<string, { total: number; count: number; items: Transaction[] }>();

        transactions.forEach(t => {
            if (t.type !== 'expense') return; // Only expenses

            const tDate = new Date(t.date);
            if (tDate.getFullYear() === year && tDate.getMonth() === month) {
                const dateStr = tDate.toISOString().split('T')[0];
                const current = dayStats.get(dateStr) || { total: 0, count: 0, items: [] };

                dayStats.set(dateStr, {
                    total: current.total + t.amount,
                    count: current.count + 1,
                    items: [...current.items, t]
                });
            }
        });

        return dayStats;
    }, [transactions, currentDate]);

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="flex gap-2">
                    <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-semibold text-gray-400">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-2">
                {daysInMonth.map((date, index) => {
                    if (!date) return <div key={`empty-${index}`} />;

                    const dateStr = date.toISOString().split('T')[0];
                    const stat = monthStats.get(dateStr);
                    const isToday = new Date().toDateString() === date.toDateString();
                    const hasSpending = stat && stat.total > 0;

                    return (
                        <motion.button
                            key={dateStr}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => hasSpending && setSelectedDay({ date: dateStr, transactions: stat!.items })}
                            className={`
                aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all
                ${isToday ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900' : ''}
                ${hasSpending
                                    ? 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}
              `}
                        >
                            <span className="text-sm font-medium">{date.getDate()}</span>
                            {hasSpending && (
                                <div className="mt-1">
                                    <span className="text-[10px] font-bold">₹{Math.round(stat.total / 100) / 10}k</span>
                                    <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-500" />
                                </div>
                            )}
                        </motion.button>
                    );
                })}
            </div>

            {/* Selected Day Details Modal */}
            <AnimatePresence>
                {selectedDay && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        onClick={() => setSelectedDay(null)}
                    >
                        <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm max-h-[80vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                                <h4 className="font-bold text-lg dark:text-white">
                                    {new Date(selectedDay.date).toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}
                                </h4>
                                <button onClick={() => setSelectedDay(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-3">
                                {selectedDay.transactions.map(t => (
                                    <div key={t.id} className="flex justify-between items-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700">
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-white">{t.description || 'Unknown'}</div>
                                            <div className="text-xs text-gray-500">{t.category}</div>
                                        </div>
                                        <div className="font-bold text-gray-900 dark:text-white">
                                            ₹{t.amount.toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AnalyticsCalendar;
