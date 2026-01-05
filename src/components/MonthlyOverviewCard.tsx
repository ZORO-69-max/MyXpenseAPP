import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface MonthlyOverviewCardProps {
  transactions: any[];
}

const MonthlyOverviewCard = ({ transactions }: MonthlyOverviewCardProps) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkMode = localStorage.getItem('theme') === 'dark';
    setIsDark(isDarkMode);

    // Get last 30 days grouped by week
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date;
    });

    // Group by weeks (4-5 data points for monthly view)
    const weeklyData: { [key: string]: { income: number; expense: number; startDate: Date } } = {};

    last30Days.forEach(date => {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Get Sunday of the week
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { income: 0, expense: 0, startDate: weekStart };
      }

      const dateStr = date.toISOString().split('T')[0];
      const dayTransactions = transactions.filter(t => {
        if (!t.date) return false;
        const tDate = new Date(t.date);
        if (isNaN(tDate.getTime())) return false; // Check for invalid date
        return tDate.toISOString().split('T')[0] === dateStr;
      });

      dayTransactions.forEach(t => {
        if (t.type === 'income') {
          weeklyData[weekKey].income += t.amount;
        } else if (t.type === 'expense') {
          weeklyData[weekKey].expense += t.amount;
        } else if (t.type === 'debt' || t.isTripSettlement) {
          // Exclude debts from Monthly Overview as per user request
          // Only explicit Income/Expense types should appear.
          // The "Settlement Surplus" (Income) and "Forgiven" (Expense) are standard Income/Expense types so they will naturally appear.
          // We intentionally SKIP 'debt' and 'tripSettlement' here.
        }
      });
    });

    const data = Object.values(weeklyData)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .map((week, index) => ({
        day: `Week ${index + 1}`,
        income: week.income,
        expense: week.expense,
      }));

    setChartData(data);
  }, [transactions]);

  const totalIncome = chartData.reduce((sum, day) => sum + day.income, 0);
  const totalExpense = chartData.reduce((sum, day) => sum + day.expense, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-sm"
    >
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Monthly Overview (Last 30 Days)
      </h3>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Income</span>
          </div>
          <p className="text-lg font-bold text-green-600 dark:text-green-500">
            ₹{totalIncome.toLocaleString()}
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <span className="text-xs text-gray-600 dark:text-gray-400">Expenses</span>
          </div>
          <p className="text-lg font-bold text-red-600 dark:text-red-500">
            ₹{totalExpense.toLocaleString()}
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
          <XAxis
            dataKey="day"
            stroke={isDark ? '#9ca3af' : '#6b7280'}
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke={isDark ? '#9ca3af' : '#6b7280'}
            style={{ fontSize: '12px' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? '#1f2937' : '#ffffff',
              border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
              borderRadius: '8px',
              color: isDark ? '#ffffff' : '#000000'
            }}
            formatter={(value: number) => `₹${value.toLocaleString()}`}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px' }}
            iconType="circle"
          />
          <Bar dataKey="income" fill="#10b981" radius={[8, 8, 0, 0]} />
          <Bar dataKey="expense" fill="#ef4444" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default MonthlyOverviewCard;
