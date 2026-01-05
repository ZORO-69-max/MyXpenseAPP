export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};


// Register for periodic background sync if available
export const registerPeriodicSync = async () => {
  if ('serviceWorker' in navigator && 'periodicSync' in ServiceWorkerRegistration.prototype) {
    try {
      const registration = await navigator.serviceWorker.ready;
      // Check if we have permission
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const status = await (navigator as any).permissions.query({ name: 'periodic-background-sync' });
      if (status.state === 'granted') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (registration as any).periodicSync.register('check-reminders', {
          minInterval: 60 * 60 * 1000, // 1 hour minimum
        });
        console.log('[FCM] Periodic background sync registered');
        return true;
      }
    } catch (error) {
      console.log('[FCM] Periodic sync not supported:', error);
    }
  }
  return false;
};

// Helper to get vibration pattern based on intensity
export const getVibrationPattern = (): number[] => {
  const intensity = localStorage.getItem('vibration_intensity') || 'medium';
  console.log('[FCM] Getting vibration pattern for intensity:', intensity);
  switch (intensity) {
    case 'off': return [];
    case 'low': return [100, 50, 100];
    case 'medium': return [200, 100, 200];
    case 'high': return [500, 100, 500, 100, 500, 100, 1000];
    default: return [200, 100, 200];
  }
};

// Extend NotificationOptions to include vibrate which is standard but sometimes missing in types
interface ExtendedNotificationOptions extends NotificationOptions {
  vibrate?: number[];
}

export const showLocalNotification = async (title: string, options?: ExtendedNotificationOptions) => {
  if (Notification.permission !== 'granted') {
    console.log('[FCM] Notification permission not granted');
    return;
  }

  const vibratePattern = getVibrationPattern();
  console.log('[FCM] Vibrate pattern determined:', vibratePattern);

  // If app is visible, trigger vibration manually to ensure feedback
  // (Notification API vibration is often suppressed when app is in foreground)
  if (document.visibilityState === 'visible' && 'vibrate' in navigator) {
    navigator.vibrate(vibratePattern);
  }

  try {
    // Always prefer Service Worker for better background support
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      // Use type assertion for SW-specific notification options
      const swOptions = {
        icon: '/pwa-192x192.png',
        badge: '/pwa-72x72.png',
        vibrate: vibratePattern,
        requireInteraction: false,
        ...options,
        data: {
          url: '/',
          timestamp: Date.now()
        }
      } as ExtendedNotificationOptions;

      await registration.showNotification(title, swOptions);
      console.log('[FCM] Notification shown via Service Worker');
    } else {
      // Fallback to regular Notification API
      new Notification(title, {
        icon: '/pwa-192x192.png',
        badge: '/pwa-72x72.png',
        vibrate: vibratePattern,
        ...options
      });
      console.log('[FCM] Notification shown via Notification API');
    }
  } catch (error) {
    console.error('Error showing notification:', error);
    // Final fallback
    try {
      new Notification(title, {
        icon: '/pwa-192x192.png',
        vibrate: vibratePattern,
        ...options
      });
    } catch (fallbackError) {
      console.error('Fallback notification also failed:', fallbackError);
    }
  }
};

import { getFCMToken as getFirebaseFCMToken, onForegroundMessage } from '../config/firebase';

export const getFCMToken = async (): Promise<string | null> => {
  try {
    const token = await getFirebaseFCMToken();
    return token;
  } catch (error) {
    console.error('[FCM] Error getting token:', error);
    return null;
  }
};

export const onFCMMessage = (callback: (payload: any) => void) => {
  return onForegroundMessage(callback);
};

export const sendLowBalanceNotification = (balance: number) => {
  const notificationsEnabled = localStorage.getItem('notifications_enabled') !== 'false';
  const lowBalanceAlertsEnabled = localStorage.getItem('low_balance_alerts') !== 'false';

  if (notificationsEnabled && lowBalanceAlertsEnabled && Notification.permission === 'granted') {
    showLocalNotification('⚠️ Low Balance Alert', {
      body: `Your balance is ₹${balance.toLocaleString()}. Consider adding income or reducing expenses.`,
      tag: 'low-balance',
      requireInteraction: true
    });
  }
};

export const sendBudgetNotification = (category: string, spent: number, budget: number) => {
  const notificationsEnabled = localStorage.getItem('notifications_enabled') !== 'false';
  const budgetRemindersEnabled = localStorage.getItem('budget_reminders') !== 'false';

  if (notificationsEnabled && budgetRemindersEnabled && Notification.permission === 'granted') {
    const percentage = Math.round((spent / budget) * 100);
    showLocalNotification('💰 Budget Alert', {
      body: `You've spent ${percentage}% of your ${category} budget (₹${spent.toLocaleString()} of ₹${budget.toLocaleString()})`,
      tag: 'budget-alert',
      requireInteraction: false
    });
  }
};

export const cancelDailyReminder = () => {
  const existingTimeout = localStorage.getItem('daily_reminder_timeout');
  if (existingTimeout) {
    clearTimeout(Number(existingTimeout));
    localStorage.removeItem('daily_reminder_timeout');
  }
};

export const scheduleDailyReminder = () => {
  cancelDailyReminder();

  const dailyReminderEnabled = localStorage.getItem('daily_reminder_enabled') === 'true';
  const selectedDays = JSON.parse(localStorage.getItem('daily_reminder_days') || '[0,1,2,3,4,5,6]'); // All days by default

  // Get primary time - default 6 PM (18:00)
  const reminderTime1 = localStorage.getItem('daily_reminder_time') || '18:00';

  // Get secondary time (Bi-Daily) - default 1 AM (01:00) for night owls
  const biDailyEnabled = localStorage.getItem('bi_daily_reminder_enabled') !== 'false'; // Enabled by default
  const reminderTime2 = localStorage.getItem('bi_daily_reminder_time') || '01:00';

  const notificationsEnabled = localStorage.getItem('notifications_enabled') !== 'false';

  if (!dailyReminderEnabled || !notificationsEnabled) {
    return;
  }

  const now = new Date();


  // If today isn't selected, maybe tomorrow is?
  // Logic below handles scheduling loop accurately

  // Create Date objects for times
  const timesToCheck: string[] = [reminderTime1];
  if (biDailyEnabled) {
    timesToCheck.push(reminderTime2);
  }

  let nextScheduledTime: Date | null = null;
  let minDiff = Infinity;

  // Use for...of loop for better TS inference
  for (const timeStr of timesToCheck) {
    const [h, m] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m, 0, 0);

    // Initial Check: Is Today valid?
    if (selectedDays.includes(now.getDay())) {
      // If time passed for today, start checking from Tomorrow
      if (date.getTime() <= now.getTime()) {
        date.setDate(date.getDate() + 1);
      }
    } else {
      // Today invalid, so force to Tomorrow to start check
      if (date.getTime() <= now.getTime()) { // Should always be true if we skip today, but just safely increment
        date.setDate(date.getDate() + 1);
      }
    }

    // Validate the Day (Tomorrow onwards)
    // Safety Break: 30 days
    let daysChecked = 0;
    while (!selectedDays.includes(date.getDay())) {
      date.setDate(date.getDate() + 1);
      daysChecked++;
      if (daysChecked > 30) break;
    }

    // Ensure we didn't end up in past (sanity check)
    if (date.getTime() <= now.getTime()) {
      date.setDate(date.getDate() + 1); // Should not happen with above logic but safety
    }

    const diff = date.getTime() - now.getTime();
    if (diff > 0 && diff < minDiff) {
      minDiff = diff;
      nextScheduledTime = date;
    }
  }

  if (!nextScheduledTime) return;

  const timeUntilReminder = nextScheduledTime.getTime() - now.getTime();

  const timeoutId = setTimeout(() => {
    showDailyReminderNotification();
    setTimeout(() => scheduleDailyReminder(), 60000); // Reschedule after running
  }, timeUntilReminder);

  localStorage.setItem('daily_reminder_timeout', String(timeoutId));
};

export const showDailyReminderNotification = () => {
  const notificationsEnabled = localStorage.getItem('notifications_enabled') !== 'false';
  const dailyReminderEnabled = localStorage.getItem('daily_reminder_enabled') === 'true';

  // Double check permissions and settings at trigger time
  if (notificationsEnabled && dailyReminderEnabled && Notification.permission === 'granted') {
    const userName = localStorage.getItem('myxpense_user_name') || 'there';
    const messages = [
      `Good morning ${userName}! 🌅 Don't forget to track your expenses today.`,
      `Hi ${userName}! 💰 Keep your finances in check today!`,
      `Hello ${userName}! 📊 Time to review your spending habits.`,
      `Hey ${userName}! 💳 Have you tracked your expenses today?`,
      `Reminder ${userName}! 🎯 Stay on top of your budget today!`
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    showLocalNotification('📝 Daily Expense Reminder', {
      body: randomMessage,
      tag: 'daily-reminder',
      requireInteraction: false,
      icon: '/pwa-192x192.png',
      badge: '/pwa-72x72.png'
    });

    saveNotificationToDB({
      id: `notif_${Date.now()}`,
      userId: localStorage.getItem('myxpense_user_id') || 'local',
      type: 'daily_reminder',
      title: '📝 Daily Expense Reminder',
      message: randomMessage,
      read: false,
      createdAt: new Date()
    });
  }
};

import type { Notification } from '../types';

const saveNotificationToDB = async (notification: Notification) => {
  try {
    const { saveNotification } = await import('./db');
    await saveNotification(notification);
  } catch (error) {
    console.error('Error saving notification to DB:', error);
  }
};


