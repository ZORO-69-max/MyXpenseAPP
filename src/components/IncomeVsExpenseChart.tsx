import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BarChart3 } from 'lucide-react';
import type { Transaction } from '../types';

interface IncomeVsExpenseChartProps {
    transactions: Transaction[];
}

const IncomeVsExpenseChart = ({ transactions }: IncomeVsExpenseChartProps) => {
    const data = useMemo(() => {
        const last6Months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthName = d.toLocaleString('default', { month: 'short' });
            const month = d.getMonth();
            const year = d.getFullYear();

            // Calculate totals for this month
            let income = 0;
            let expense = 0;

            transactions.forEach(t => {
                const tDate = new Date(t.date);
                if (tDate.getMonth() === month && tDate.getFullYear() === year) {
                    if (t.type === 'income') {
                        income += t.amount;
                    } else if (t.type === 'expense') {
                        expense += t.amount;
                    } else if (t.type === 'debt' || (t as any).isTripSettlement) {
                        if (t.debtType === 'lent' && t.debtStatus === 'pending') expense += t.amount;
                        else if (t.debtType === 'borrowed' && t.debtStatus === 'pending') income += t.amount;
                        else if (t.debtType === 'settlement_out') expense += t.amount;
                        else if (t.debtType === 'settlement_in') income += t.amount;
                    }
                }
            });

            last6Months.push({
                name: monthName,
                Income: income,
                Expense: expense
            });
        }
        return last6Months;
    }, [transactions]);

    return (

        <div className="bg-gradient-to-br from-white to-amber-50/50 dark:from-gray-800 dark:to-gray-800/80 rounded-2xl p-5 shadow-lg shadow-amber-500/10 border border-amber-100 dark:border-amber-900/30 h-full flex flex-col relative overflow-hidden">
            {/* Decorative background blob */}
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl opacity-60 pointer-events-none"></div>

            <div className="flex items-center justify-between mb-6 shrink-0 relative z-10">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20">
                        <BarChart3 className="w-4 h-4" strokeWidth={2.5} />
                    </div>
                    Income vs Expense
                </h3>
                <div className="flex gap-2 text-[10px] font-bold uppercase tracking-wider">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm ring-1 ring-emerald-200 dark:ring-emerald-800"></div>
                        <span className="text-emerald-700 dark:text-emerald-300">Income</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-sm ring-1 ring-rose-200 dark:ring-rose-800"></div>
                        <span className="text-rose-700 dark:text-rose-300">Expense</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full min-h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={6}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-gray-700/50" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#6B7280', fontSize: 10, fontWeight: 500 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#6B7280', fontSize: 9, fontWeight: 500 }}
                            tickFormatter={(value) => `₹${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
                        />
                        <Tooltip
                            cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                            contentStyle={{
                                borderRadius: '12px',
                                border: 'none',
                                boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.1)',
                                padding: '12px',
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                backdropFilter: 'blur(4px)'
                            }}
                        />
                        <defs>
                            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10B981" stopOpacity={0.8} />
                                <stop offset="100%" stopColor="#10B981" stopOpacity={0.2} />
                            </linearGradient>
                            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.8} />
                                <stop offset="100%" stopColor="#F43F5E" stopOpacity={0.2} />
                            </linearGradient>
                        </defs>
                        <Bar
                            dataKey="Income"
                            fill="url(#incomeGradient)"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={32}
                            animationDuration={1500}
                        />
                        <Bar
                            dataKey="Expense"
                            fill="url(#expenseGradient)"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={32}
                            animationDuration={1500}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default IncomeVsExpenseChart;
