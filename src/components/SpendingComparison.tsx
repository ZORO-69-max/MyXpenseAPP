import { useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Transaction } from '../types';

interface SpendingComparisonProps {
    transactions: Transaction[];
}

const SpendingComparison = ({ transactions }: SpendingComparisonProps) => {
    const stats = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonth = lastMonthDate.getMonth();
        const lastMonthYear = lastMonthDate.getFullYear();

        let thisMonthTotal = 0;
        let lastMonthTotal = 0;
        const categories: Record<string, number> = {};

        transactions.forEach(t => {
            let amount = 0;
            if (t.type === 'expense') {
                amount = t.amount;
            } else if (t.type === 'debt' || (t as any).isTripSettlement) {
                if ((t.debtType === 'lent' && t.debtStatus === 'pending') || t.debtType === 'settlement_out') {
                    amount = t.amount;
                }
            }

            if (amount === 0) return;

            // Calculate categories based on ALL filtered transactions (dynamic)
            const category = t.category || (t.isTripSettlement ? 'Trip Settlement' : 'Debt');
            categories[category] = (categories[category] || 0) + amount;

            // Calculate Monthly Comparison (Strictly Calendar Month)
            const d = new Date(t.date);
            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                thisMonthTotal += amount;
            } else if (d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear) {
                lastMonthTotal += amount;
            }
        });

        const percentChange = lastMonthTotal > 0
            ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
            : 0;

        const topCategories = Object.entries(categories)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 3);

        return {
            thisMonthTotal,
            lastMonthTotal,
            percentChange,
            isIncrease: thisMonthTotal > lastMonthTotal,
            topCategories
        };
    }, [transactions]);

    const maxVal = Math.max(stats.thisMonthTotal, stats.lastMonthTotal, 1);

    return (
        <div className="bg-gradient-to-br from-white to-indigo-50/50 dark:from-gray-800 dark:to-gray-800/80 rounded-2xl p-5 shadow-lg shadow-indigo-500/10 border border-indigo-100 dark:border-indigo-900/30 h-full flex flex-col relative overflow-hidden">
            {/* Stronger decorative background blob */}
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
            <div className="absolute -left-12 bottom-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl opacity-40 pointer-events-none"></div>

            <div className="flex items-center justify-between mb-6 shrink-0 relative z-10">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-500 text-white shadow-md shadow-indigo-500/20">
                        <TrendingUp className="w-4 h-4" strokeWidth={2.5} />
                    </div>
                    Monthly Comparison
                </h3>
                <div className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 border shadow-sm ${stats.isIncrease
                    ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/30 dark:border-rose-900/50 dark:text-rose-400'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-900/50 dark:text-emerald-400'
                    }`}>
                    {stats.isIncrease ? <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} /> : <ArrowDownRight className="w-3.5 h-3.5" strokeWidth={2.5} />}
                    <span className="text-[11px] font-extrabold">{Math.abs(stats.percentChange).toFixed(0)}%</span>
                </div>
            </div>

            {/* Bar Chart Comparison - Enhanced Visuals */}
            <div className="flex items-end justify-between gap-6 mb-6 flex-1 px-4 relative">
                {/* Background Grid Lines to scale */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                    <div className="h-px bg-indigo-200 border-t border-dashed border-gray-400 w-full"></div>
                    <div className="h-px bg-indigo-200 border-t border-dashed border-gray-400 w-full"></div>
                    <div className="h-px bg-indigo-200 border-t border-dashed border-gray-400 w-full"></div>
                </div>

                {/* Last Month */}
                <div className="flex flex-col items-center gap-2 w-full relative z-10 group">
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Last Mo.</span>
                        <span className="text-sm font-bold text-gray-500">
                            {stats.lastMonthTotal >= 1000 ? `${(stats.lastMonthTotal / 1000).toFixed(1)}k` : stats.lastMonthTotal}
                        </span>
                    </div>
                    <motion.div
                        initial={{ height: 0 }}
                        whileInView={{ height: `${Math.max((stats.lastMonthTotal / maxVal) * 100, 10)}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="w-full max-w-[60px] bg-gradient-to-t from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-t-xl relative overflow-hidden shadow-sm group-hover:shadow-md transition-shadow"
                    >
                        <div className="absolute top-0 inset-x-0 h-[2px] bg-white/50"></div>
                    </motion.div>
                </div>

                {/* This Month */}
                <div className="flex flex-col items-center gap-2 w-full relative z-10 group">
                    <div className="flex flex-col items-center">
                        <span className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${stats.isIncrease ? 'text-rose-500' : 'text-emerald-500'}`}>This Mo.</span>
                        <span className={`text-lg font-bold ${stats.isIncrease ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {stats.thisMonthTotal >= 1000 ? `${(stats.thisMonthTotal / 1000).toFixed(1)}k` : stats.thisMonthTotal}
                        </span>
                    </div>
                    <motion.div
                        initial={{ height: 0 }}
                        whileInView={{ height: `${Math.max((stats.thisMonthTotal / maxVal) * 100, 10)}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                        className={`w-full max-w-[60px] rounded-t-xl relative overflow-hidden shadow-md group-hover:shadow-lg transition-shadow ${stats.isIncrease
                            ? 'bg-gradient-to-t from-rose-500 to-rose-400'
                            : 'bg-gradient-to-t from-emerald-500 to-emerald-400'
                            }`}
                    >
                        <div className="absolute top-0 inset-x-0 h-[2px] bg-white/50"></div>
                        <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent"></div>
                    </motion.div>
                </div>
            </div>

            {/* Quick Categories - Sub-card Style */}
            <div className="space-y-2.5 mt-auto shrink-0 relative z-10">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-2">
                    <Layers className="w-3 h-3" /> Top Categories
                </div>
                {stats.topCategories.map((cat, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-center gap-2.5">
                            <div className={`w-2 h-2 rounded-full ring-2 ring-white dark:ring-gray-700 shadow-sm ${idx === 0 ? 'bg-indigo-500' : idx === 1 ? 'bg-purple-500' : 'bg-pink-500'}`}></div>
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate max-w-[100px]">{cat.name}</span>
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white text-xs">₹{cat.amount.toLocaleString()}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SpendingComparison;
