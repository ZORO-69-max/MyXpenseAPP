import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, TrendingUp, PiggyBank, Target, ChevronDown } from 'lucide-react';

const AutoSavingsCalculator = () => {
    const [income, setIncome] = useState<number>(0);
    const [savingsGoalPercent, setSavingsGoalPercent] = useState<number>(20);
    const [fixedExpenses, setFixedExpenses] = useState<number>(0);
    const [isOpen, setIsOpen] = useState(false); // Collapsible state, default closed
    const [customDays, setCustomDays] = useState<number>(10);
    const containerRef = useRef<HTMLDivElement>(null);

    const [results, setResults] = useState({
        savingsAmount: 0,
        safeToSpend: 0,
        dailyLimit: 0,
        yearSavings: 0,
        customSavings: 0
    });

    useEffect(() => {
        const savedIncome = localStorage.getItem('calc_income');
        const savedFixed = localStorage.getItem('calc_fixed');
        if (savedIncome) setIncome(parseFloat(savedIncome));
        if (savedFixed) setFixedExpenses(parseFloat(savedFixed));
    }, []);

    useEffect(() => {
        if (isOpen && containerRef.current) {
            // Small timeout to ensure animation starts/layout updates
            setTimeout(() => {
                containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    }, [isOpen]);

    useEffect(() => {
        const savingsAmount = (income * savingsGoalPercent) / 100;
        const remainingAfterSavings = income - savingsAmount;
        const safeToSpend = Math.max(0, remainingAfterSavings - fixedExpenses);
        const dailyLimit = safeToSpend / 30;

        const yearSavings = savingsAmount * 12;
        const dailySavings = savingsAmount / 30;
        const customSavings = dailySavings * (customDays || 0);

        setResults({
            savingsAmount,
            safeToSpend,
            dailyLimit,
            yearSavings,
            customSavings
        });

        if (income > 0) localStorage.setItem('calc_income', income.toString());
        if (fixedExpenses > 0) localStorage.setItem('calc_fixed', fixedExpenses.toString());
    }, [income, savingsGoalPercent, fixedExpenses, customDays]);

    return (
        <div ref={containerRef} className={`rounded-3xl shadow-md border overflow-hidden relative transition-all duration-300 ${isOpen ? 'bg-white dark:bg-gray-900 border-indigo-100 dark:border-indigo-900/30 ring-2 ring-indigo-500/10' : 'bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-700/50'}`}>
            {/* Soft Glow Effect behind */}
            {!isOpen && <div className="absolute inset-0 bg-white/40 dark:bg-black/20 backdrop-blur-sm pointer-events-none" />}

            {/* Header / Trigger */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-4 flex items-center justify-between group relative z-10"
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-2xl transition-all duration-300 ${isOpen ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-indigo-100 dark:ring-indigo-700/50'}`}>
                        <Calculator className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-bold text-gray-900 dark:text-white text-sm">Smart Budget</h3>
                        <p className="text-xs text-indigo-600/80 dark:text-indigo-300/80 font-medium">
                            {isOpen ? 'Plan monthly savings' : 'Tap to expand & plan'}
                        </p>
                    </div>
                </div>
                <div className={`p-1.5 rounded-full transition-all duration-300 ${isOpen ? 'rotate-180 bg-gray-100 dark:bg-gray-800 text-gray-500' : 'bg-indigo-200/50 dark:bg-indigo-800/50 text-indigo-700 dark:text-indigo-300'}`}>
                    <ChevronDown className="w-4 h-4" />
                </div>
            </button>

            {/* Collapsible Content */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                    >
                        <div className="p-5 pt-0 grid grid-cols-1 gap-4">
                            {/* Inputs */}
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Monthly Income (₹)</label>
                                    <input
                                        type="number"
                                        value={income || ''}
                                        onChange={e => setIncome(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Fixed Expenses (₹)</label>
                                    <input
                                        type="number"
                                        value={fixedExpenses || ''}
                                        onChange={e => setFixedExpenses(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                                        placeholder="Rent, Bills..."
                                    />
                                </div>

                                <div>
                                    <label className="flex justify-between text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                                        <span>Savings Goal</span>
                                        <span className="text-indigo-600 dark:text-indigo-400">{savingsGoalPercent}%</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="80"
                                        step="5"
                                        value={savingsGoalPercent}
                                        onChange={e => setSavingsGoalPercent(parseInt(e.target.value))}
                                        className="w-full accent-indigo-500 bg-gray-200 dark:bg-gray-700 rounded-lg h-1.5 cursor-pointer appearance-none"
                                    />
                                </div>
                            </div>

                            {/* Results */}
                            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/10 dark:to-purple-900/10 rounded-xl p-4 border border-indigo-100 dark:border-indigo-900/20 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600">
                                            <PiggyBank className="w-4 h-4" />
                                        </div>
                                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Monthly Savings</span>
                                    </div>
                                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">₹{results.savingsAmount.toLocaleString()}</span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                                            <Target className="w-4 h-4" />
                                        </div>
                                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Spendable</span>
                                    </div>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">₹{results.safeToSpend.toLocaleString()}</span>
                                </div>

                                <div className="h-px bg-indigo-200/50 dark:bg-indigo-700/30"></div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600">
                                            <TrendingUp className="w-4 h-4" />
                                        </div>
                                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Daily Limit</span>
                                    </div>
                                    <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">₹{Math.floor(results.dailyLimit).toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Savings Projection Section */}
                            <div className="mt-2 space-y-2">
                                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 ml-1">Savings Projection</h4>
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700/50 space-y-2">
                                    {/* 1 Year Projection */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">1 Year</span>
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">₹{Math.floor(results.yearSavings).toLocaleString()}</span>
                                    </div>

                                    {/* Custom Days Projection */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 flex-1">
                                            <input
                                                type="number"
                                                min="1"
                                                value={customDays || ''}
                                                onChange={e => setCustomDays(parseInt(e.target.value) || 0)}
                                                className="w-16 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                placeholder="Days"
                                            />
                                            <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Days</span>
                                        </div>
                                        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">₹{Math.floor(results.customSavings).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AutoSavingsCalculator;
