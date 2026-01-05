import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { clearAllData } from '../utils/db';
import { clearFirestoreSync, updateUserProfile as updateFirestoreProfile } from '../services/firestoreSync';
import { syncQueue } from '../services/syncQueue';
import {
  isFirebaseConfigured,
  firebaseAuthMethods,
  type FirebaseUser
} from '../config/firebase';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  isFirebaseAuth: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserName: (newName: string) => Promise<void>;
  updateUserPhoto: (newPhotoURL: string | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirebaseAuth, setIsFirebaseAuth] = useState(false);

  const setupUserSession = useCallback((userId: string, userName: string, userEmail: string | null, createdAt: string, photoURL?: string | null) => {
    // Update Local Storage
    localStorage.setItem('myxpense_user_id', userId);
    localStorage.setItem('myxpense_user_name', userName);
    if (photoURL) {
      localStorage.setItem('profile_picture', photoURL);
    }

    // Initialize Services
    syncQueue.setUser(userId);
    // Note: hybridDataService uses AuthContext state, so no explicit init needed here if it reads from hook/context

    // Set State
    const firebaseUser: any = {
      uid: userId,
      displayName: userName,
      email: userEmail,
      photoURL: photoURL || null,
      metadata: { creationTime: createdAt }
    };
    setCurrentUser(firebaseUser);

    setUserProfile({
      uid: userId,
      name: userName,
      email: userEmail || '',
      photoURL: photoURL || undefined,
      createdAt: new Date(createdAt)
    });

    // Attempt to sync latest profile from Firestore to be sure
    updateFirestoreProfile(userId, { name: userName, email: userEmail || undefined, photoURL: photoURL || undefined }).catch(err => {
      console.warn('Background profile sync failed:', err);
    });
  }, []);

  const clearUserSession = useCallback(() => {
    // Clear Local Storage
    localStorage.removeItem('myxpense_user_id');
    localStorage.removeItem('myxpense_user_name');
    localStorage.removeItem('profile_picture');

    // Clear Services state
    syncQueue.setUser(null);
    clearFirestoreSync();

    // Reset State
    setCurrentUser(null);
    setUserProfile(null);
  }, []);

  useEffect(() => {
    const firebaseConfigured = isFirebaseConfigured();
    setIsFirebaseAuth(firebaseConfigured);

    if (firebaseConfigured) {
      const unsubscribe = firebaseAuthMethods.onAuthChange((user) => {
        if (user) {
          setupUserSession(
            user.uid,
            user.displayName || 'User',
            user.email,
            user.metadata?.creationTime || new Date().toISOString(),
            user.photoURL
          );
        } else {
          clearUserSession();
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // If Firebase not configured, we cannot login.
      // Or fallback to local mode if needed. 
      // User requested "fully remove bypass", implying they assume Firebase IS configured.
      // But if user meant "reconnect firebase", maybe we should warn if missing?
      // Assuming firebase IS configured or will be.
      setLoading(false);
    }
  }, [setupUserSession, clearUserSession]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isFirebaseAuth) {
      throw new Error('Authentication requires Firebase configuration.');
    }
    const result = await firebaseAuthMethods.signInWithEmail(email, password);
    const user = result.user;
    setupUserSession(
      user.uid,
      user.displayName || 'User',
      user.email,
      user.metadata.creationTime || new Date().toISOString(),
      user.photoURL
    );
  }, [isFirebaseAuth, setupUserSession]);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    if (!isFirebaseAuth) {
      throw new Error('Authentication requires Firebase configuration.');
    }
    const result = await firebaseAuthMethods.signUpWithEmail(email, password, name);
    const user = result.user;
    setupUserSession(
      user.uid,
      name,
      user.email,
      user.metadata.creationTime || new Date().toISOString()
    );
  }, [isFirebaseAuth, setupUserSession]);

  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseAuth) {
      throw new Error('Google sign-in requires Firebase configuration.');
    }

    const result = await firebaseAuthMethods.signInWithGoogle();
    const user = result.user;
    setupUserSession(
      user.uid,
      user.displayName || 'User',
      user.email,
      user.metadata.creationTime || new Date().toISOString(),
      user.photoURL
    );
  }, [isFirebaseAuth, setupUserSession]);

  const signOut = useCallback(async () => {
    if (isFirebaseAuth) {
      try {
        await firebaseAuthMethods.signOut();
      } catch (error) {
        console.error('Firebase sign out error:', error);
      }
    }

    clearUserSession();

    try {
      await clearAllData();
    } catch (error) {
      console.error('Error clearing local data:', error);
    }

    setCurrentUser(null);
    setUserProfile(null);
  }, [isFirebaseAuth, clearUserSession]);

  const resetPassword = useCallback(async (email: string) => {
    if (!isFirebaseAuth) {
      throw new Error('Password reset requires Firebase configuration.');
    }

    await firebaseAuthMethods.sendPasswordReset(email);
  }, [isFirebaseAuth]);

  const updateUserName = useCallback(async (newName: string) => {
    if (!currentUser) {
      throw new Error('No user logged in');
    }

    const userId = currentUser.uid;

    localStorage.setItem('myxpense_user_name', newName);

    if (isFirebaseAuth) {
      try {
        await firebaseAuthMethods.updateUserDisplayName(newName);
      } catch (error) {
        console.error('Error updating Firebase Auth display name:', error);
      }
    }

    try {
      await updateFirestoreProfile(userId, { name: newName });
    } catch (error) {
      console.error('Error updating Firestore profile:', error);
    }

    setUserProfile(prev => prev ? { ...prev, name: newName } : null);

    if (currentUser) {
      setCurrentUser(prev => prev ? {
        ...prev,
        displayName: newName
      } : null);
    }
  }, [currentUser, isFirebaseAuth]);

  const updateUserPhoto = useCallback(async (newPhotoURL: string | null) => {
    if (!currentUser) {
      throw new Error('No user logged in');
    }

    const userId = currentUser.uid;

    if (newPhotoURL) {
      localStorage.setItem('profile_picture', newPhotoURL);
    } else {
      localStorage.removeItem('profile_picture');
    }

    if (isFirebaseAuth) {
      try {
        await firebaseAuthMethods.updateUserPhoto(newPhotoURL);
      } catch (error) {
        console.error('Error updating Firebase Auth photo:', error);
      }
    }

    try {
      // Sync to Firestore Users collection
      await updateFirestoreProfile(userId, { photoURL: newPhotoURL || undefined });
    } catch (error) {
      console.error('Error updating Firestore profile:', error);
    }

    setUserProfile(prev => prev ? { ...prev, photoURL: newPhotoURL || undefined } : null);

    if (currentUser) {
      setCurrentUser(prev => prev ? {
        ...prev,
        photoURL: newPhotoURL
      } : null);
    }
  }, [currentUser, isFirebaseAuth]);

  const value = useMemo(() => ({
    currentUser,
    userProfile,
    loading,
    isFirebaseAuth,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    updateUserName,
    updateUserPhoto
  }), [
    currentUser,
    userProfile,
    loading,
    isFirebaseAuth,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    updateUserName,
    updateUserPhoto
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
