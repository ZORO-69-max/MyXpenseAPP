import { useMemo } from 'react';
import { TrendingUp, ShoppingBag, Utensils, Car, Home, Zap, HeartPulse, Plane } from 'lucide-react';
import type { Transaction } from '../types';

interface TopExpensesCardProps {
    transactions: Transaction[];
}

// Map categories to icons (reusing logic from other components could be better but inline is faster for now)
const CategoryIcon = ({ category }: { category: string }) => {
    const normCat = category.toLowerCase();
    if (normCat.includes('food') || normCat.includes('dining')) return <Utensils className="w-4 h-4 text-orange-500" />;
    if (normCat.includes('transport') || normCat.includes('fuel')) return <Car className="w-4 h-4 text-blue-500" />;
    if (normCat.includes('home') || normCat.includes('rent')) return <Home className="w-4 h-4 text-purple-500" />;
    if (normCat.includes('bill') || normCat.includes('utility')) return <Zap className="w-4 h-4 text-yellow-500" />;
    if (normCat.includes('health') || normCat.includes('medical')) return <HeartPulse className="w-4 h-4 text-red-500" />;
    if (normCat.includes('shop')) return <ShoppingBag className="w-4 h-4 text-pink-500" />;
    if (normCat.includes('travel') || normCat.includes('trip')) return <Plane className="w-4 h-4 text-sky-500" />;

    return <ShoppingBag className="w-4 h-4 text-gray-500" />;
};

const TopExpensesCard = ({ transactions }: TopExpensesCardProps) => {
    const topExpenses = useMemo(() => {
        return transactions
            .filter(t => t.type === 'expense')
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 7);
    }, [transactions]);

    return (
        <div className="bg-gradient-to-br from-white to-violet-50/50 dark:from-gray-800 dark:to-gray-800/80 rounded-2xl p-5 shadow-lg shadow-violet-500/10 border border-violet-100 dark:border-violet-900/30 flex flex-col relative overflow-hidden">
            {/* Decorative background blob */}
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl opacity-60 pointer-events-none"></div>

            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2 shrink-0 relative z-10">
                <div className="p-1.5 rounded-lg bg-violet-500 text-white shadow-md shadow-violet-500/20">
                    <TrendingUp className="w-4 h-4" strokeWidth={2.5} />
                </div>
                Top Expenses
            </h3>

            <div className="space-y-2.5 relative z-10 overflow-y-auto pr-1 custom-scrollbar">
                {topExpenses.length > 0 ? (
                    topExpenses.map((expense, idx) => (
                        <div key={expense.id} className="flex items-center justify-between group p-2.5 rounded-xl bg-white/60 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50 hover:border-violet-200 dark:hover:border-violet-800 hover:shadow-md transition-all">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ring-2 ring-white dark:ring-gray-700 ${idx === 0 ? 'bg-gradient-to-br from-amber-100 to-amber-200 text-amber-700' :
                                    idx === 1 ? 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 dark:bg-gray-800' :
                                        'bg-gray-50 text-gray-400 dark:bg-gray-800/50'
                                    }`}>
                                    <CategoryIcon category={expense.category} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm text-gray-900 dark:text-white truncate font-medium">
                                        {expense.description || expense.category}
                                    </p>
                                    <p className="text-[10px] text-gray-400 flex items-center gap-1 font-medium">
                                        {new Date(expense.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                        <span className="w-0.5 h-0.5 rounded-full bg-gray-300"></span>
                                        {expense.category}
                                    </p>
                                </div>
                            </div>
                            <span className="text-xs font-bold text-gray-900 dark:text-white shrink-0 bg-violet-50 dark:bg-violet-900/20 px-2.5 py-1 rounded-lg border border-violet-100 dark:border-violet-900/10">
                                -₹{expense.amount.toLocaleString()}
                            </span>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-xs">
                        No expenses recorded yet.
                    </div>
                )}
            </div>
        </div>
    );
};

export default TopExpensesCard;
