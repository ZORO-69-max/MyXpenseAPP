import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore
} from 'firebase/firestore';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type Auth,
  type User
} from 'firebase/auth';
import {
  getMessaging,
  getToken,
  onMessage,
  type Messaging
} from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const isFirebaseConfigured = (): boolean => {
  // FORCE_LOCAL_MODE removed to enable Firebase
  // const FORCE_LOCAL_MODE = true; 


  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  const isConfigured = !!(
    apiKey &&
    projectId &&
    apiKey !== 'undefined' &&
    projectId !== 'undefined' &&
    apiKey.trim() !== '' &&
    projectId.trim() !== ''
  );

  if (import.meta.env.DEV) {
    console.log('[Firebase Config] API Key exists:', !!apiKey && apiKey !== 'undefined');
    console.log('[Firebase Config] Project ID exists:', !!projectId && projectId !== 'undefined');
    console.log('[Firebase Config] Is configured:', isConfigured);
  }

  return isConfigured;
};

let app: FirebaseApp | null = null;
export let db: Firestore | null = null;
export let auth: Auth | null = null;
let messaging: Messaging | null = null;

const initializeFirebase = () => {
  if (!isFirebaseConfigured()) {
    console.log('[Firebase] Not configured - running in local-only mode');
    return;
  }

  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });

    auth = getAuth(app);
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn('[Firebase] Auth persistence error:', err);
    });

    // Initialize Firebase Cloud Messaging
    if ('Notification' in window && 'serviceWorker' in navigator) {
      try {
        messaging = getMessaging(app);
        console.log('[Firebase] Messaging initialized');
      } catch (msgError) {
        console.warn('[Firebase] Messaging initialization error:', msgError);
      }
    }

    console.log('[Firebase] Initialized successfully');
  } catch (error) {
    console.error('[Firebase] Initialization error:', error);
    app = null;
    db = null;
    auth = null;
    messaging = null;
  }
};

initializeFirebase();

export const getFirebaseApp = (): FirebaseApp | null => app;
export const getFirebaseMessaging = (): Messaging | null => messaging;

// FCM Token management
export const getFCMToken = async (vapidKey?: string): Promise<string | null> => {
  if (!messaging) {
    console.log('[FCM] Messaging not initialized');
    return null;
  }

  try {
    // Register service worker for FCM with config
    const swUrl = new URL('/firebase-messaging-sw.js', window.location.origin);
    const params = new URLSearchParams();
    params.append('apiKey', import.meta.env.VITE_FIREBASE_API_KEY);
    params.append('projectId', import.meta.env.VITE_FIREBASE_PROJECT_ID);
    params.append('messagingSenderId', import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID);
    params.append('appId', import.meta.env.VITE_FIREBASE_APP_ID);

    swUrl.search = params.toString();

    const registration = await navigator.serviceWorker.register(swUrl.href);

    const token = await getToken(messaging, {
      vapidKey: vapidKey || import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      console.log('[FCM] Token obtained:', token.substring(0, 20) + '...');
      localStorage.setItem('fcm_token', token);
      return token;
    }

    console.log('[FCM] No token available');
    return null;
  } catch (error) {
    console.error('[FCM] Error getting token:', error);
    return null;
  }
};

// Listen for foreground messages
export const onForegroundMessage = (callback: (payload: any) => void) => {
  if (!messaging) {
    console.log('[FCM] Messaging not initialized');
    return () => { };
  }

  return onMessage(messaging, (payload) => {
    console.log('[FCM] Foreground message received:', payload);
    callback(payload);
  });
};
export const getFirebaseDb = (): Firestore | null => db;
export const getFirebaseAuth = (): Auth | null => auth;

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const firebaseAuthMethods = {
  signInWithGoogle: async () => {
    const authInstance = getFirebaseAuth();
    if (!authInstance) throw new Error('Firebase not configured');
    return signInWithPopup(authInstance, googleProvider);
  },

  signInWithEmail: async (email: string, password: string) => {
    const authInstance = getFirebaseAuth();
    if (!authInstance) throw new Error('Firebase not configured');
    return signInWithEmailAndPassword(authInstance, email, password);
  },

  signUpWithEmail: async (email: string, password: string, displayName: string) => {
    const authInstance = getFirebaseAuth();
    if (!authInstance) throw new Error('Firebase not configured');
    const result = await createUserWithEmailAndPassword(authInstance, email, password);
    if (result.user) {
      await updateProfile(result.user, { displayName });
    }
    return result;
  },

  sendPasswordReset: async (email: string) => {
    const authInstance = getFirebaseAuth();
    if (!authInstance) throw new Error('Firebase not configured');
    return sendPasswordResetEmail(authInstance, email);
  },

  signOut: async () => {
    const authInstance = getFirebaseAuth();
    if (!authInstance) throw new Error('Firebase not configured');
    return firebaseSignOut(authInstance);
  },

  onAuthChange: (callback: (user: User | null) => void) => {
    const authInstance = getFirebaseAuth();
    if (!authInstance) {
      callback(null);
      return () => { };
    }
    return onAuthStateChanged(authInstance, callback);
  },

  updateUserDisplayName: async (displayName: string) => {
    const authInstance = getFirebaseAuth();
    if (!authInstance) throw new Error('Firebase not configured');
    const currentUser = authInstance.currentUser;
    if (!currentUser) throw new Error('No user logged in');
    await updateProfile(currentUser, { displayName });
    return currentUser;
  },

  updateUserPhoto: async (photoURL: string | null) => {
    const authInstance = getFirebaseAuth();
    if (!authInstance) throw new Error('Firebase not configured');
    const currentUser = authInstance.currentUser;
    if (!currentUser) throw new Error('No user logged in');
    await updateProfile(currentUser, { photoURL });
    return currentUser;
  }
};

export type { User as FirebaseUser };
