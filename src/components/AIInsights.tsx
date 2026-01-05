import { useState, useEffect, useCallback } from 'react';
import { Brain, TrendingUp, TrendingDown, Target, Lightbulb, X } from 'lucide-react';

const AIInsights = () => {
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInsights, setShowInsights] = useState(true);

  // Memoize the generation function to prevent unnecessary recalculations
  const generateInsights = useCallback(() => {
    try {
      const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
      const goals = JSON.parse(localStorage.getItem('goals') || '[]');
    
    const generatedInsights = [];
    
    // Calculate spending by category
    const categorySpending: { [key: string]: number } = {};
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    transactions.forEach((t: any) => {
      if (t.type === 'expense') {
        const category = t.category || 'other';
        categorySpending[category] = (categorySpending[category] || 0) + t.amount;
      }
    });
    
    // Find top spending category
    const topCategory = Object.entries(categorySpending).sort((a, b) => b[1] - a[1])[0];
    if (topCategory) {
      generatedInsights.push({
        id: 1,
        type: 'spending',
        icon: TrendingDown,
        color: 'text-red-500',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        title: 'Top Spending Category',
        message: `You spent ₹${topCategory[1].toLocaleString()} on ${topCategory[0]} this period. Consider setting a budget limit.`,
      });
    }
    
    // Goal insights - evaluate all goals and show most relevant
    if (goals.length > 0) {
      const incompleteGoals = goals.filter((g: any) => g.currentAmount < g.targetAmount);
      
      if (incompleteGoals.length > 0) {
        // Show insight for goal with highest progress
        const activeGoal = incompleteGoals.sort((a: any, b: any) => 
          (b.currentAmount / b.targetAmount) - (a.currentAmount / a.targetAmount)
        )[0];
        
        const progress = Math.min((activeGoal.currentAmount / activeGoal.targetAmount) * 100, 100);
        const remaining = Math.max(activeGoal.targetAmount - activeGoal.currentAmount, 0);
        
        if (progress < 50) {
          generatedInsights.push({
            id: 2,
            type: 'goal',
            icon: Target,
            color: 'text-purple-500',
            bgColor: 'bg-purple-50 dark:bg-purple-900/20',
            title: 'Goal Progress',
            message: `You're ${Math.round(progress)}% towards your "${activeGoal.name}" goal. Save ₹${Math.ceil(remaining / 30)} daily to reach it in a month!`,
          });
        } else if (progress >= 80 && progress < 100) {
          generatedInsights.push({
            id: 2,
            type: 'goal',
            icon: Target,
            color: 'text-green-500',
            bgColor: 'bg-green-50 dark:bg-green-900/20',
            title: 'Almost There!',
            message: `Great progress! You're ${Math.round(progress)}% towards your "${activeGoal.name}" goal. Just ₹${remaining.toLocaleString()} left!`,
          });
        }
      } else {
        // All goals completed
        generatedInsights.push({
          id: 2,
          type: 'goal',
          icon: Target,
          color: 'text-green-500',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          title: 'Goals Achieved!',
          message: `Congratulations! You've completed all your savings goals. Time to set new ones! 🎉`,
        });
      }
    }
    
    // Spending pattern insight (last 7 days)
    const weeklyTransactions = transactions.filter((t: any) => 
      new Date(t.date) >= weekAgo && t.type === 'expense'
    );
    const weeklySpending = weeklyTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);
    const avgDailySpending = weeklySpending / 7;
    
    if (avgDailySpending > 0) {
      generatedInsights.push({
        id: 3,
        type: 'pattern',
        icon: Lightbulb,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        title: 'Weekly Spending Pattern',
        message: `Your average daily spending this week is ₹${Math.round(avgDailySpending)}. Try the 50-30-20 rule: 50% needs, 30% wants, 20% savings!`,
      });
    }
    
    // Income vs Expense balance (all-time)
    const totalIncome = transactions
      .filter((t: any) => t.type === 'income')
      .reduce((sum: number, t: any) => sum + t.amount, 0);
    const totalExpense = transactions
      .filter((t: any) => t.type === 'expense')
      .reduce((sum: number, t: any) => sum + t.amount, 0);
    
    // Calculate savings rate properly, including negative rates
    if (totalIncome > 0) {
      const savingsRate = ((totalIncome - totalExpense) / totalIncome) * 100;
      
      if (savingsRate > 20) {
        generatedInsights.push({
          id: 4,
          type: 'success',
          icon: TrendingUp,
          color: 'text-green-500',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          title: 'Excellent Savings!',
          message: `You're saving ${Math.round(savingsRate)}% of your total income. Keep up the great work! 🎉`,
        });
      } else if (savingsRate >= 0 && savingsRate < 10) {
        generatedInsights.push({
          id: 4,
          type: 'warning',
          icon: TrendingDown,
          color: 'text-orange-500',
          bgColor: 'bg-orange-50 dark:bg-orange-900/20',
          title: 'Low Savings Rate',
          message: `You're only saving ${Math.round(savingsRate)}% of your total income. Try to aim for at least 20% savings.`,
        });
      } else if (savingsRate < 0) {
        generatedInsights.push({
          id: 4,
          type: 'warning',
          icon: TrendingDown,
          color: 'text-red-500',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          title: 'Overspending Alert',
          message: `You're spending ${Math.abs(Math.round(savingsRate))}% more than your income. Review your expenses to avoid debt.`,
        });
      }
    } else if (totalExpense > 0) {
      generatedInsights.push({
        id: 4,
        type: 'warning',
        icon: TrendingDown,
        color: 'text-red-500',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        title: 'No Income Tracked',
        message: `You have expenses of ₹${totalExpense.toLocaleString()} but no income recorded. Add your income to track savings.`,
      });
    }
    
      setInsights(generatedInsights.slice(0, 3)); // Show top 3 insights
      setLoading(false);
    } catch (error) {
      console.error('[AIInsights] Error generating insights:', error);
      setInsights([]);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    generateInsights();
  }, [generateInsights]);

  if (!showInsights || insights.length === 0) return null;

  return (
    <div className="px-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Insights</h3>
        </div>
        <button 
          onClick={() => setShowInsights(false)}
          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          </div>
        ) : (
          insights.map((insight) => {
            const Icon = insight.icon;
            return (
              <div
                key={insight.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start space-x-3">
                  <div className={`w-10 h-10 rounded-xl ${insight.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${insight.color}`} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {insight.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {insight.message}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <button
        onClick={generateInsights}
        className="w-full mt-3 py-2 text-sm text-purple-500 hover:text-purple-600 font-medium transition-colors"
      >
        Refresh Insights
      </button>
    </div>
  );
};

export default AIInsights;
