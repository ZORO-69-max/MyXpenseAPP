import { useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import type { Transaction } from '../types';

interface SpendingHeatmapProps {
    transactions: Transaction[];
    year?: number;
}

const SpendingHeatmap = ({ transactions, year = new Date().getFullYear() }: SpendingHeatmapProps) => {
    // Generate calendar data
    const calendarData = useMemo(() => {
        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31);
        const data: { date: string; amount: number; level: number }[] = [];
        const spendingMap = new Map<string, number>();

        // 1. Map spending by date
        transactions.forEach(t => {
            if (t.type !== 'expense') return; // Only track expenses
            const dateStr = new Date(t.date).toISOString().split('T')[0];
            const current = spendingMap.get(dateStr) || 0;
            spendingMap.set(dateStr, current + t.amount);
        });

        // 2. Calculate thresholds for levels (0-4)
        const amounts = Array.from(spendingMap.values()).filter(v => v > 0);
        const maxSpend = Math.max(...amounts, 1);

        // 3. Fill every day of the year
        const current = new Date(startOfYear);
        while (current <= endOfYear) {
            const dateStr = current.toISOString().split('T')[0];
            const amount = spendingMap.get(dateStr) || 0;

            let level = 0;
            if (amount > 0) {
                if (amount > maxSpend * 0.75) level = 4;
                else if (amount > maxSpend * 0.5) level = 3;
                else if (amount > maxSpend * 0.25) level = 2;
                else level = 1;
            }

            data.push({ date: dateStr, amount, level });
            current.setDate(current.getDate() + 1);
        }

        return data;
    }, [transactions, year]);

    const getLevelColor = (level: number) => {
        switch (level) {
            case 0: return 'bg-gray-100 dark:bg-gray-800';
            case 1: return 'bg-emerald-200 dark:bg-emerald-900/40';
            case 2: return 'bg-emerald-300 dark:bg-emerald-800';
            case 3: return 'bg-emerald-400 dark:bg-emerald-600';
            case 4: return 'bg-emerald-500 dark:bg-emerald-500';
            default: return 'bg-gray-100 dark:bg-gray-800';
        }
    };

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Auto-scroll to the end (current date) on mount and when data loads
        if (scrollRef.current) {
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
                }
            }, 100);
        }
    }, [calendarData.length]);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return (

        <div className="bg-gradient-to-br from-white to-emerald-50/50 dark:from-gray-800 dark:to-gray-800/80 rounded-2xl p-5 shadow-lg shadow-emerald-500/10 border border-emerald-100 dark:border-emerald-900/30 flex flex-col h-full relative overflow-hidden">
            {/* Decorative background blob */}
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl opacity-60 pointer-events-none"></div>

            <div className="flex items-center justify-between mb-6 shrink-0 relative z-10">
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20">
                        <Calendar className="w-4 h-4" strokeWidth={2.5} />
                    </div>
                    Spending Activity
                </h3>

                {/* Legend - Enhanced */}
                <div className="flex items-center gap-2 text-[10px] font-medium bg-gray-50 dark:bg-gray-800/50 px-2 py-1 rounded-lg border border-gray-100 dark:border-gray-700/50">
                    <span className="text-gray-400">Less</span>
                    <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-[2px] bg-emerald-200 dark:bg-emerald-900/40 shadow-sm" />
                        <div className="w-2 h-2 rounded-[2px] bg-emerald-300 dark:bg-emerald-800 shadow-sm" />
                        <div className="w-2 h-2 rounded-[2px] bg-emerald-400 dark:bg-emerald-600 shadow-sm" />
                        <div className="w-2 h-2 rounded-[2px] bg-emerald-500 dark:bg-emerald-500 shadow-sm" />
                    </div>
                    <span className="text-gray-400">More</span>
                </div>
            </div>

            {/* Heatmap Grid - Flexible Height */}
            <div ref={scrollRef} className="overflow-x-auto overflow-y-hidden flex-1 scrollbar-hide w-full cursor-grab active:cursor-grabbing">
                <div className="min-w-fit pr-4">
                    {/* Months Header */}
                    <div className="flex mb-2 text-[10px] text-gray-400 dark:text-gray-500 font-medium pl-8">
                        {months.map(m => (
                            <div key={m} className="flex-1 text-center w-12">{m}</div>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        {/* Weekday Labels */}
                        <div className="flex flex-col justify-between text-[9px] text-gray-400 dark:text-gray-500 font-medium h-[110px] py-1">
                            <span>Mon</span>
                            <span>Wed</span>
                            <span>Fri</span>
                        </div>

                        {/* Grid */}
                        <div className="grid grid-rows-7 grid-flow-col gap-[3px]">
                            {calendarData.map((day) => (
                                <motion.div
                                    key={day.date}
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    whileHover={{ scale: 1.2, zIndex: 10 }}
                                    className={`w-3.5 h-3.5 rounded-[3px] ${getLevelColor(day.level)} relative group transition-colors duration-200`}
                                >
                                    {/* Tooltip */}
                                    {day.amount > 0 && (
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 whitespace-nowrap">
                                            <div className="bg-gray-800/90 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-1 rounded-md shadow-lg border border-white/10">
                                                {new Date(day.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}: ₹{day.amount.toLocaleString()}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SpendingHeatmap;
