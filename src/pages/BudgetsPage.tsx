import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, Plus, AlertCircle, TrendingUp, Sparkles, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import AddBudgetModal from '../components/AddBudgetModal';
import EditBudgetModal from '../components/EditBudgetModal';
import MonthlyBudgetCard from '../components/MonthlyBudgetCard';
import { useTransactions, useBudgets } from '../hooks/useFirestoreSync';

const BudgetsPage = () => {
  const navigate = useNavigate();
  const { budgets } = useBudgets();
  const { transactions } = useTransactions();
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [showEditBudget, setShowEditBudget] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<any>(null);
  const [totalMonthlyBudget, setTotalMonthlyBudget] = useState(0);
  const [showSmartAllocation, setShowSmartAllocation] = useState(false);

  useEffect(() => {
    const storedMonthlyBudget = parseFloat(localStorage.getItem('monthly_budget') || '0');
    setTotalMonthlyBudget(storedMonthlyBudget);
  }, []);

  const calculateSpent = (category?: string) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return transactions
      .filter(t => {
        const isExpense = t.type === 'expense';
        const isThisMonth = new Date(t.date) >= startOfMonth;
        const matchesCategory = category ? t.category === category : true;
        return isExpense && isThisMonth && matchesCategory;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getTotalSpent = () => {
    return calculateSpent();
  };

  const handleUpdateMonthlyBudget = (newBudget: number) => {
    localStorage.setItem('monthly_budget', newBudget.toString());
    setTotalMonthlyBudget(newBudget);
  };

  const handleEditBudget = (budget: any) => {
    setSelectedBudget(budget);
    setShowEditBudget(true);
  };

  const generateSmartAllocation = () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const hasRecentData = transactions.some(t => new Date(t.date) >= fourteenDaysAgo && t.type === 'expense');
    const referenceDate = hasRecentData ? fourteenDaysAgo : thirtyDaysAgo;
    const periodName = hasRecentData ? '2-week' : '30-day';

    const categorySpending: { [key: string]: number } = {};
    
    transactions
      .filter(t => t.type === 'expense' && new Date(t.date) >= referenceDate)
      .forEach(t => {
        const cat = t.category || 'Others';
        categorySpending[cat] = (categorySpending[cat] || 0) + t.amount;
      });

    const totalSpending = Object.values(categorySpending).reduce((sum, val) => sum + val, 0);
    
    if (totalSpending === 0 || totalMonthlyBudget === 0) {
      alert('Not enough spending data or monthly budget not set. Please add expenses and set your monthly budget first.');
      return;
    }

    const smartBudgets = Object.entries(categorySpending).map(([category, spent]) => {
      const proportion = spent / totalSpending;
      const suggestedBudget = Math.round(proportion * totalMonthlyBudget);
      
      return {
        id: Date.now().toString() + Math.random(),
        category,
        amount: suggestedBudget,
        createdAt: new Date().toISOString(),
        isSmartGenerated: true
      };
    });

    const existingBudgets = JSON.parse(localStorage.getItem('budgets') || '[]');
    const mergedBudgets = [...existingBudgets];

    smartBudgets.forEach(smartBudget => {
      const existingIndex = mergedBudgets.findIndex(b => b.category === smartBudget.category);
      if (existingIndex === -1) {
        mergedBudgets.push(smartBudget);
      }
    });

    localStorage.setItem('budgets', JSON.stringify(mergedBudgets));
    setShowSmartAllocation(false);
    
    alert(`Smart budget allocation complete! Budgets created based on your ${periodName} spending patterns.`);
  };

  return (
    <>
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
          <div className="max-w-md mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Budgets</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Manage your spending limits</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddBudget(true)}
                className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-md mx-auto p-4 space-y-4">
          {/* Monthly Budget Card */}
          <MonthlyBudgetCard 
            totalBudget={totalMonthlyBudget}
            totalSpent={getTotalSpent()}
            onUpdateBudget={handleUpdateMonthlyBudget}
          />

          {/* Smart Allocation Button */}
          {totalMonthlyBudget > 0 && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setShowSmartAllocation(true)}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl p-4 flex items-center justify-between hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg"
            >
              <div className="flex items-center space-x-3">
                <Sparkles className="w-6 h-6" />
                <div className="text-left">
                  <h3 className="font-semibold">Smart Budget Allocation</h3>
                  <p className="text-xs opacity-90">Auto-allocate based on spending patterns</p>
                </div>
              </div>
              <TrendingUp className="w-5 h-5" />
            </motion.button>
          )}

          {/* Category Budgets */}
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Category Budgets</h2>
            {budgets.length > 0 ? (
              <div className="space-y-3">
                <AnimatePresence>
                  {budgets.map((budget: any) => {
                    const spent = calculateSpent(budget.category);
                    const percentage = budget.amount > 0 ? Math.min(Math.round((spent / budget.amount) * 100), 100) : 0;
                    const isOverBudget = spent > budget.amount;
                    const remaining = Math.max(budget.amount - spent, 0);

                    return (
                      <motion.div 
                        key={budget.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        onClick={() => handleEditBudget(budget)}
                        className={`bg-white dark:bg-gray-800 rounded-xl p-4 border cursor-pointer hover:shadow-lg transition-all ${
                          isOverBudget ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold text-gray-900 dark:text-white capitalize">{budget.category}</h3>
                              {budget.isSmartGenerated && (
                                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] font-medium rounded-full">
                                  Smart
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              ₹{spent.toLocaleString()} of ₹{budget.amount.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                              ₹{remaining.toLocaleString()} remaining
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {isOverBudget && (
                              <AlertCircle className="w-5 h-5 text-red-500" />
                            )}
                            <Edit2 className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.5 }}
                            className={`${isOverBudget ? 'bg-red-500' : 'bg-blue-500'} rounded-full h-2.5`}
                          />
                        </div>
                        {isOverBudget && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-medium">
                            Over budget by ₹{(spent - budget.amount).toLocaleString()}
                          </p>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
              >
                <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Category Budgets Yet</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 px-4">
                  Create budgets for specific categories to track your spending better
                </p>
                <button 
                  onClick={() => setShowAddBudget(true)}
                  className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
                >
                  Create Your First Budget
                </button>
              </motion.div>
            )}
          </div>
        </div>

        {/* Smart Allocation Confirmation Modal */}
        <AnimatePresence>
          {showSmartAllocation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="absolute inset-0 bg-black/50" onClick={() => setShowSmartAllocation(false)}></div>
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full"
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Smart Budget Allocation</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    We'll analyze your recent spending patterns and automatically create budgets for each category proportional to your usage.
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowSmartAllocation(false)}
                    className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={generateSmartAllocation}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all"
                  >
                    Generate
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modals */}
        <AddBudgetModal 
          isOpen={showAddBudget}
          onClose={() => setShowAddBudget(false)}
          onBudgetAdded={() => {}}
        />
        <EditBudgetModal 
          isOpen={showEditBudget}
          onClose={() => setShowEditBudget(false)}
          budget={selectedBudget}
          onUpdate={() => {}}
        />
      </div>
    </PageTransition>
  </>
  );
};

export default BudgetsPage;
