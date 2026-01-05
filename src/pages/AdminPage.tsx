import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Activity,
  TrendingUp,
  TrendingDown,
  Database,
  Download,
  Send,
  Brain,
  Zap,
  Shield,
  ArrowLeft
} from 'lucide-react';
import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/AuthContext';
import { getTransactions, getBudgets, getGoals, getTrips, getTripExpenses } from '../utils/db';

const AdminPage = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalExpenses: 0,
    totalIncomes: 0,
    storageUsed: 0,
    aiQueries: 0,
    aiTokens: 0,
    lastAIAccess: null as string | null,
  });
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');

  useEffect(() => {
    loadAdminData();
  }, [userProfile?.uid]);

  const loadAdminData = async () => {
    if (!userProfile?.uid) return;
    
    try {
      const transactions = await getTransactions(userProfile.uid);
      const users = JSON.parse(localStorage.getItem('admin_users') || '[]');
      const aiData = JSON.parse(localStorage.getItem('admin_ai_usage') || '{ "queries": 0, "tokens": 0, "lastAccess": null }');
      const activityData = JSON.parse(localStorage.getItem('admin_activity') || '[]');
      
      const totalExpenses = transactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalIncomes = transactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      let storageSize = 0;
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          storageSize += localStorage[key].length + key.length;
        }
      }
      const storageMB = (storageSize / 1024 / 1024).toFixed(2);
      
      setStats({
        totalUsers: users.length || 1,
        activeUsers: users.filter((u: any) => {
          const lastActive = new Date(u.lastActive);
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return lastActive > dayAgo;
        }).length || 1,
        totalExpenses,
        totalIncomes,
        storageUsed: parseFloat(storageMB),
        aiQueries: aiData.queries || 0,
        aiTokens: aiData.tokens || 0,
        lastAIAccess: aiData.lastAccess,
      });

      setActivityLog(activityData.slice(0, 10));
    } catch (error) {
      console.error('[AdminPage] Error loading admin data:', error);
    }
  };

  const handleExportCSV = async () => {
    if (!userProfile?.uid) {
      alert('Please log in to export data.');
      return;
    }
    
    try {
      const [transactions, goals, budgets, trips] = await Promise.all([
        getTransactions(userProfile.uid),
        getGoals(userProfile.uid),
        getBudgets(userProfile.uid),
        getTrips(userProfile.uid)
      ]);
      
      const allTripExpenses = await Promise.all(
        trips.map(trip => getTripExpenses(trip.id))
      );
      const tripExpenses = allTripExpenses.flat();
      
      let csv = 'Type,Data\n';
      csv += `Total Transactions,${transactions.length}\n`;
      csv += `Total Goals,${goals.length}\n`;
      csv += `Total Budgets,${budgets.length}\n`;
      csv += `Total Trips,${trips.length}\n`;
      csv += `Total Trip Expenses,${tripExpenses.length}\n`;
      csv += `Total Expenses,${stats.totalExpenses}\n`;
      csv += `Total Incomes,${stats.totalIncomes}\n`;
      csv += `Storage Used (MB),${stats.storageUsed}\n`;
      csv += '\n\nTransactions\n';
      csv += 'Date,Type,Amount,Category,Description\n';
      
      transactions.forEach((t) => {
        const date = new Date(t.date).toLocaleDateString();
        const description = (t.description || '').replace(/"/g, '""');
        const category = (t.category || '').replace(/"/g, '""');
        csv += `${date},${t.type},${t.amount},"${category}","${description}"\n`;
      });
      
      if (trips.length > 0) {
        csv += '\n\nTrips\n';
        csv += 'Name,Icon,Created At,Ended,Ended At,Participants\n';
        trips.forEach((trip) => {
          const name = (trip.name || '').replace(/"/g, '""');
          const icon = (trip.icon || '').replace(/"/g, '""');
          const createdAt = trip.createdAt ? new Date(trip.createdAt).toLocaleDateString() : '';
          const endedAt = trip.endedAt ? new Date(trip.endedAt).toLocaleDateString() : '';
          const participants = trip.participants?.map(p => p.name).join('; ') || '';
          csv += `"${name}","${icon}",${createdAt},${trip.ended || false},${endedAt},"${participants}"\n`;
        });
      }
      
      if (tripExpenses.length > 0) {
        csv += '\n\nTrip Expenses\n';
        csv += 'Date,Amount,Category,Title,Paid By\n';
        tripExpenses.forEach((expense) => {
          const date = new Date(expense.date).toLocaleDateString();
          const title = (expense.title || '').replace(/"/g, '""');
          const category = (expense.category || '').replace(/"/g, '""');
          csv += `${date},${expense.amount},"${category}","${title}","${expense.paidBy || ''}"\n`;
        });
      }
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `myxpense-data-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[AdminPage] Error exporting CSV:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  const handleSendBroadcast = () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      alert('Please enter both title and message');
      return;
    }

    // In production, this would send FCM notifications to all users
    // For now, we'll log the broadcast and show a local notification
    const broadcast = {
      id: Date.now().toString(),
      title: broadcastTitle,
      message: broadcastMessage,
      timestamp: new Date().toISOString(),
      sentBy: 'Admin',
    };

    // Store broadcast history
    const broadcasts = JSON.parse(localStorage.getItem('admin_broadcasts') || '[]');
    broadcasts.unshift(broadcast);
    localStorage.setItem('admin_broadcasts', JSON.stringify(broadcasts.slice(0, 50)));

    // Show local notification
    import('../utils/fcm').then(({ showLocalNotification }) => {
      showLocalNotification(broadcastTitle, {
        body: broadcastMessage,
        icon: '/pwa-192x192.png',
        badge: '/pwa-72x72.png',
      });
    });

    alert('Broadcast sent successfully!');
    setBroadcastTitle('');
    setBroadcastMessage('');
    setShowBroadcast(false);
  };

  const StatCard = ({ icon: Icon, title, value, color, subtitle }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 dark:text-gray-500">{subtitle}</p>}
    </motion.div>
  );

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/')}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-6 h-6" />
                </motion.button>
                <div>
                  <h1 className="text-2xl font-bold">Admin Portal</h1>
                  <p className="text-sm opacity-90">MyXpense Management Dashboard</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-8 h-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto p-4 sm:p-6">
          {/* Statistics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={Users}
              title="Total Users"
              value={stats.totalUsers}
              color="bg-blue-500"
              subtitle={`${stats.activeUsers} active today`}
            />
            <StatCard
              icon={TrendingUp}
              title="Total Income"
              value={`₹${stats.totalIncomes.toLocaleString()}`}
              color="bg-green-500"
            />
            <StatCard
              icon={TrendingDown}
              title="Total Expenses"
              value={`₹${stats.totalExpenses.toLocaleString()}`}
              color="bg-red-500"
            />
            <StatCard
              icon={Database}
              title="Storage Used"
              value={`${stats.storageUsed} MB`}
              color="bg-purple-500"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* OpenAI Usage Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">AI Usage</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Queries</span>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">{stats.aiQueries}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Tokens Used</span>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">{stats.aiTokens.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Last Access</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {stats.lastAIAccess ? new Date(stats.lastAIAccess).toLocaleString() : 'Never'}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700"
            >
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowBroadcast(true)}
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-4 rounded-xl font-semibold shadow-md"
                >
                  <Send className="w-5 h-5" />
                  <span>Send Broadcast</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleExportCSV}
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white p-4 rounded-xl font-semibold shadow-md"
                >
                  <Download className="w-5 h-5" />
                  <span>Export Data (CSV)</span>
                </motion.button>
              </div>
            </motion.div>
          </div>

          {/* Activity Log */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Activity</h2>
            </div>
            {activityLog.length > 0 ? (
              <div className="space-y-3">
                {activityLog.map((log, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Zap className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{log.action}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Activity className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No recent activity</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Broadcast Modal */}
        {showBroadcast && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowBroadcast(false)}></div>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md p-6 shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Send Broadcast</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Broadcast Title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message
                  </label>
                  <textarea
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Enter your broadcast message..."
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowBroadcast(false)}
                    className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendBroadcast}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md"
                  >
                    Send
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
};

export default AdminPage;
