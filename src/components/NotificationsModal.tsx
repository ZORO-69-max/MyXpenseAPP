import { useState, useEffect } from 'react';
import { X, BellOff, Check, CheckCheck, Trash2, Bell, AlertTriangle, Target, DollarSign, Calendar, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification } from '../utils/db';
import type { Notification } from '../types';
import { useSyncStatus } from '../hooks/useSyncStatus';

import type { Transaction } from '../types';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationChange?: () => void;
  transactions?: Transaction[];
}

const NotificationsModal = ({ isOpen, onClose, onNotificationChange, transactions = [] }: NotificationsModalProps) => {
  const { userProfile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Use real-time sync status from the sync engine
  const { totalPending, syncing, isOnline } = useSyncStatus();

  useBodyScrollLock(isOpen);

  useEffect(() => {
    const savedSyncTime = localStorage.getItem('last_sync_time');
    if (savedSyncTime) {
      setLastSyncTime(new Date(savedSyncTime));
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && userProfile?.uid) {
      loadNotifications();
    }
  }, [isOpen, userProfile?.uid]);

  const loadNotifications = async () => {
    if (!userProfile?.uid) return;

    setIsLoading(true);
    try {
      const dbNotifs = await getNotifications(userProfile.uid);

      // Calculate pending debts
      const pendingDebts = transactions.filter(t => t.type === 'debt' && t.debtStatus === 'pending');
      const virtualNotifs: Notification[] = [];

      if (pendingDebts.length > 0) {
        const totalPending = pendingDebts.reduce((sum, t) => sum + t.amount, 0);
        virtualNotifs.push({
          id: 'virtual-pending-debt',
          userId: userProfile.uid,
          title: 'Pending Settlements',
          message: `You have ${pendingDebts.length} pending settlements totaling ₹${totalPending.toLocaleString()}.`,
          type: 'daily_reminder', // or system
          read: false,
          createdAt: new Date()
        });
      }

      // Merge DB notifications with virtual ones (virtual at top)
      setNotifications([...virtualNotifs, ...dbNotifs]);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id);
    await loadNotifications();
    if (onNotificationChange) {
      onNotificationChange();
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!userProfile?.uid) return;
    await markAllNotificationsAsRead(userProfile.uid);
    await loadNotifications();
    if (onNotificationChange) {
      onNotificationChange();
    }
  };

  const handleDelete = async (id: string) => {
    await deleteNotification(id);
    await loadNotifications();
    if (onNotificationChange) {
      onNotificationChange();
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'low_balance':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'budget_alert':
        return <DollarSign className="w-5 h-5 text-orange-500" />;
      case 'daily_reminder':
        return <Calendar className="w-5 h-5 text-blue-500" />;
      case 'goal_achieved':
        return <Target className="w-5 h-5 text-green-500" />;
      case 'system':
        return <Bell className="w-5 h-5 text-purple-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffMs = now.getTime() - notifDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return notifDate.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-indigo-600 p-4 flex items-center justify-between z-10">
          <div className="flex items-center space-x-2">
            <Bell className="w-6 h-6 text-white" />
            <h2 className="text-xl font-semibold text-white">Notifications</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/20 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Sync Status Banner */}
        <div className={`p-3 border-b flex items-center justify-between ${!isOnline
          ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
          : syncing
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
            : totalPending > 0
              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
              : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          }`}>
          <div className="flex items-center space-x-2">
            {!isOnline ? (
              <CloudOff className="w-4 h-4 text-orange-500" />
            ) : syncing ? (
              <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
            ) : totalPending > 0 ? (
              <Cloud className="w-4 h-4 text-amber-500" />
            ) : (
              <Cloud className="w-4 h-4 text-green-500" />
            )}
            <span className={`text-sm font-medium ${!isOnline
              ? 'text-orange-700 dark:text-orange-400'
              : syncing
                ? 'text-blue-700 dark:text-blue-400'
                : totalPending > 0
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-green-700 dark:text-green-400'
              }`}>
              {!isOnline
                ? 'Offline Mode'
                : syncing
                  ? `Syncing ${totalPending} item${totalPending !== 1 ? 's' : ''}...`
                  : totalPending > 0
                    ? `${totalPending} pending sync`
                    : 'All data synced'}
            </span>
          </div>
          {lastSyncTime && !syncing && totalPending === 0 && isOnline && (
            <span className="text-xs text-green-600 dark:text-green-500">
              Last sync: {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* Actions */}
        {notifications.length > 0 && (
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {notifications.filter(n => !n.read).length} unread
            </p>
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 font-medium flex items-center space-x-1"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark all read</span>
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="mt-4 text-gray-500 dark:text-gray-400">Loading...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="mb-4">
                <BellOff className="w-20 h-20 text-gray-300 dark:text-gray-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No notifications
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-center">
                You're all caught up!
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {notifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`p-4 border-b border-gray-200 dark:border-gray-700 transition-colors ${notification.read
                    ? 'bg-white dark:bg-gray-800'
                    : 'bg-blue-50 dark:bg-blue-900/20'
                    }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                            {notification.title}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                            {formatDate(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      {!notification.read && (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4 text-blue-500" />
                        </motion.button>
                      )}
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDelete(notification.id)}
                        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default NotificationsModal;
