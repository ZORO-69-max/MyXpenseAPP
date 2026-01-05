import { useEffect } from 'react';
import {
  scheduleDailyReminder,
  requestNotificationPermission,
  registerPeriodicSync,
  onFCMMessage,
  showLocalNotification,
  getFCMToken
} from '../utils/fcm';

export const useFCM = () => {

  useEffect(() => {
    const initializeNotifications = async () => {
      // Check if notifications are enabled in settings
      const notificationsEnabled = localStorage.getItem('notifications_enabled') !== 'false';
      const dailyReminderEnabled = localStorage.getItem('daily_reminder_enabled') === 'true';

      if (notificationsEnabled) {
        // Request permission if not already granted
        const hasPermission = await requestNotificationPermission();

        if (hasPermission) {
          // Ensure High Vibration is set as default if not present
          if (!localStorage.getItem('vibration_intensity')) {
            localStorage.setItem('vibration_intensity', 'high');
          }

          // IMPORTANT: Retrieve and store FCM Token to ensure device is registered
          await getFCMToken();

          if (dailyReminderEnabled) {
            // Schedule daily reminders if enabled
            scheduleDailyReminder();
            console.log('[useFCM] Daily reminder scheduler initialized');
          }

          // Try to register for periodic background sync (works on supported browsers with PWA installed)
          const periodicSyncRegistered = await registerPeriodicSync();
          if (periodicSyncRegistered) {
            console.log('[useFCM] Periodic background sync registered for better reliability');
          }
        } else {
          console.log('[useFCM] Notification permission not granted');
        }
      } else {
        console.log('[useFCM] Notifications disabled in settings');
      }
    };

    initializeNotifications();

    // Listen for foreground messages
    const unsubscribe = onFCMMessage((payload: any) => {
      console.log('[useFCM] Foreground message received:', payload);
      const { title, body, icon } = payload.notification || {};

      // Show System Notification (Standard behavior, not in-app popup)
      showLocalNotification(title || 'New Notification', {
        body: body || '',
        icon: icon || '/pwa-192x192.png',
        data: payload.data
      });
    });

    return () => unsubscribe();
  }, []);
};
