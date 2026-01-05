// Firebase Messaging Service Worker
// This handles background push notifications

importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
// Initialize Firebase in the service worker
const params = new URLSearchParams(self.location.search);
const config = {
    apiKey: self.FIREBASE_CONFIG?.apiKey || params.get('apiKey') || '',
    authDomain: self.FIREBASE_CONFIG?.authDomain || '',
    projectId: self.FIREBASE_CONFIG?.projectId || params.get('projectId') || '',
    storageBucket: self.FIREBASE_CONFIG?.storageBucket || '',
    messagingSenderId: self.FIREBASE_CONFIG?.messagingSenderId || params.get('messagingSenderId') || '',
    appId: self.FIREBASE_CONFIG?.appId || params.get('appId') || ''
};

firebase.initializeApp(config);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Background message received:', payload);

    const notificationTitle = payload.notification?.title || 'MyXpense Reminder';
    const notificationOptions = {
        body: payload.notification?.body || 'You have a new notification',
        icon: '/pwa-192x192.png',
        image: '/pwa-512x512.png', // Large image for expanded view
        badge: '/pwa-72x72.png',
        vibrate: [500, 100, 500, 100, 500, 100, 1000], // High intensity default
        tag: payload.data?.tag || 'myxpense-notification',
        requireInteraction: true,
        renotify: true,
        data: {
            url: payload.data?.url || '/',
            ...payload.data
        },
        actions: [
            { action: 'open', title: 'Open App' },
            { action: 'dismiss', title: 'Dismiss' }
        ]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification clicked:', event);

    event.notification.close();

    if (event.action === 'dismiss') {
        return;
    }

    // Open the app when notification is clicked
    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Check if there's already a window open
            for (const client of windowClients) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Open new window if none exists
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

// Handle push events (for scheduled notifications)
self.addEventListener('push', (event) => {
    console.log('[firebase-messaging-sw.js] Push event received');

    if (event.data) {
        const data = event.data.json();
        const title = data.notification?.title || 'MyXpense';
        const options = {
            body: data.notification?.body || 'Time to track your expenses!',
            icon: '/pwa-192x192.png',
            image: '/pwa-512x512.png',
            badge: '/pwa-72x72.png',
            vibrate: [500, 100, 500, 100, 500, 100, 1000], // High intensity default
            tag: 'myxpense-push',
            requireInteraction: true,
            renotify: true,
            data: data.data || {}
        };

        event.waitUntil(
            self.registration.showNotification(title, options)
        );
    }
});

console.log('[firebase-messaging-sw.js] Service worker loaded');
