import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  writeBatch,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { getFirebaseDb, isFirebaseConfigured } from '../config/firebase';
import { logger } from '../utils/logger';
import type { Transaction, Budget, Goal, Trip, TripExpense } from '../types';

type CollectionType = 'transactions' | 'budgets' | 'goals' | 'trips' | 'trip_expenses' | 'vault' | 'notifications';

const BATCH_SIZE = 500;

const convertTimestamps = (data: any): any => {
  if (!data) return data;

  const result = { ...data };

  Object.keys(result).forEach(key => {
    if (result[key] instanceof Timestamp) {
      result[key] = result[key].toDate();
    } else if (result[key] && typeof result[key] === 'object' && result[key].seconds !== undefined) {
      result[key] = new Date(result[key].seconds * 1000);
    }
  });

  return result;
};

const prepareForFirestore = (data: any): any => {
  if (!data || typeof data !== 'object') return data;

  const result: Record<string, any> = {};

  Object.keys(data).forEach(key => {
    const value = data[key];

    if (value === undefined || value === null) {
      return;
    }

    if (value instanceof Date) {
      if (!isNaN(value.getTime())) {
        result[key] = Timestamp.fromDate(value);
      }
    } else if (value instanceof Timestamp) {
      result[key] = value;
    } else if (typeof value === 'string' && !isNaN(Date.parse(value)) && (key.toLowerCase().includes('date') || key.toLowerCase().endsWith('at'))) {
      const dateValue = new Date(value);
      if (!isNaN(dateValue.getTime())) {
        result[key] = Timestamp.fromDate(dateValue);
      } else {
        result[key] = value;
      }
    } else if (Array.isArray(value)) {
      result[key] = value.filter(item => item !== undefined && item !== null).map((item: any) =>
        typeof item === 'object' && item !== null ? prepareForFirestore(item) : item
      );
    } else if (typeof value === 'object') {
      result[key] = prepareForFirestore(value);
    } else {
      result[key] = value;
    }
  });

  return result;
};

export class FirestoreSync {
  private userId: string;
  private unsubscribers: Map<string, () => void> = new Map();

  constructor(userId: string) {
    this.userId = userId;
  }

  private getCollectionRef(collectionName: CollectionType) {
    const db = getFirebaseDb();
    if (!db) throw new Error('Firestore not initialized');
    return collection(db, 'users', this.userId, collectionName);
  }

  async saveDocument<T extends { id: string }>(
    collectionName: CollectionType,
    data: T
  ): Promise<void> {
    if (!isFirebaseConfigured()) {
      logger.debug('Firebase not configured, skipping cloud save');
      return;
    }

    try {
      const docRef = doc(this.getCollectionRef(collectionName), data.id);
      const firestoreData = {
        ...prepareForFirestore(data),
        updatedAt: serverTimestamp(),
        syncedAt: serverTimestamp()
      };

      await setDoc(docRef, firestoreData, { merge: true });
      logger.debug(`Saved document to ${collectionName}:`, data.id);
    } catch (error) {
      logger.error(`Error saving to ${collectionName}:`, error);
      throw error;
    }
  }

  async deleteDocument(collectionName: CollectionType, id: string): Promise<void> {
    if (!isFirebaseConfigured()) return;

    try {
      const docRef = doc(this.getCollectionRef(collectionName), id);
      await deleteDoc(docRef);
      logger.debug(`Deleted document from ${collectionName}:`, id);
    } catch (error) {
      logger.error(`Error deleting from ${collectionName}:`, error);
      throw error;
    }
  }

  async batchSave<T extends { id: string }>(
    collectionName: CollectionType,
    items: T[]
  ): Promise<void> {
    if (!isFirebaseConfigured() || items.length === 0) return;

    try {
      const db = getFirebaseDb();
      if (!db) return;

      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = items.slice(i, i + BATCH_SIZE);

        for (const item of chunk) {
          const docRef = doc(this.getCollectionRef(collectionName), item.id);
          const firestoreData = {
            ...prepareForFirestore(item),
            updatedAt: serverTimestamp(),
            syncedAt: serverTimestamp()
          };
          batch.set(docRef, firestoreData, { merge: true });
        }

        await batch.commit();
        logger.debug(`Batch saved ${chunk.length} items to ${collectionName}`);
      }
    } catch (error) {
      logger.error(`Error batch saving to ${collectionName}:`, error);
      throw error;
    }
  }

  async fetchAll<T>(collectionName: CollectionType): Promise<T[]> {
    if (!isFirebaseConfigured()) return [];

    try {
      const q = query(
        this.getCollectionRef(collectionName),
        orderBy('updatedAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const results: T[] = [];

      snapshot.forEach(doc => {
        results.push(convertTimestamps({ ...doc.data(), id: doc.id }) as T);
      });

      logger.debug(`Fetched ${results.length} items from ${collectionName}`);
      return results;
    } catch (error) {
      logger.error(`Error fetching from ${collectionName}:`, error);
      return [];
    }
  }

  async fetchRecent<T>(
    collectionName: CollectionType,
    limitCount: number = 50
  ): Promise<T[]> {
    if (!isFirebaseConfigured()) return [];

    try {
      const q = query(
        this.getCollectionRef(collectionName),
        orderBy('updatedAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      const results: T[] = [];

      snapshot.forEach(doc => {
        results.push(convertTimestamps({ ...doc.data(), id: doc.id }) as T);
      });

      return results;
    } catch (error) {
      logger.error(`Error fetching recent from ${collectionName}:`, error);
      return [];
    }
  }

  subscribeToCollection<T>(
    collectionName: CollectionType,
    callback: (data: T[]) => void,
    options: { limit?: number; where?: any[] } = {}
  ): () => void {
    if (!isFirebaseConfigured()) {
      return () => { };
    }

    const unsubsKey = `${collectionName}_${JSON.stringify(options)}`;
    const existingUnsub = this.unsubscribers.get(unsubsKey);
    if (existingUnsub) {
      existingUnsub();
    }

    let q = query(
      this.getCollectionRef(collectionName),
      orderBy('updatedAt', 'desc')
    );

    if (options.limit) {
      q = query(q, limit(options.limit));
    }

    // Support basic 'where' functionality if needed later, 
    // for now focused on Limit for efficiency.

    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        const results: T[] = [];
        snapshot.forEach(doc => {
          results.push(convertTimestamps({ ...doc.data(), id: doc.id }) as T);
        });

        const hasPendingWrites = snapshot.metadata.hasPendingWrites;
        if (!hasPendingWrites) {
          callback(results);
        }
      },
      (error) => {
        logger.error(`Snapshot error for ${collectionName}:`, error);
      }
    );

    this.unsubscribers.set(unsubsKey, unsubscribe);
    return unsubscribe;
  }

  unsubscribeAll(): void {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers.clear();
  }

  async syncTransactions(transactions: Transaction[]): Promise<void> {
    await this.batchSave('transactions', transactions);
  }

  async syncBudgets(budgets: Budget[]): Promise<void> {
    await this.batchSave('budgets', budgets);
  }

  async syncGoals(goals: Goal[]): Promise<void> {
    await this.batchSave('goals', goals);
  }

  async syncTrips(trips: Trip[]): Promise<void> {
    await this.batchSave('trips', trips);
  }

  async syncTripExpenses(expenses: TripExpense[]): Promise<void> {
    await this.batchSave('trip_expenses', expenses);
  }

  async performFullBackup(data: {
    transactions: Transaction[];
    budgets: Budget[];
    goals: Goal[];
    trips: Trip[];
    tripExpenses: TripExpense[];
  }): Promise<void> {
    if (!isFirebaseConfigured()) {
      logger.debug('Firebase not configured, skipping backup');
      return;
    }

    logger.debug('Starting full backup...');

    await Promise.all([
      this.syncTransactions(data.transactions),
      this.syncBudgets(data.budgets),
      this.syncGoals(data.goals),
      this.syncTrips(data.trips),
      this.syncTripExpenses(data.tripExpenses)
    ]);

    logger.debug('Full backup completed');
  }
  async batchDelete(
    collectionName: CollectionType,
    ids: string[]
  ): Promise<void> {
    if (!isFirebaseConfigured() || ids.length === 0) return;

    try {
      const db = getFirebaseDb();
      if (!db) return;

      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = ids.slice(i, i + BATCH_SIZE);

        for (const id of chunk) {
          const docRef = doc(this.getCollectionRef(collectionName), id);
          batch.delete(docRef);
        }

        await batch.commit();
        logger.debug(`Batch deleted ${chunk.length} items from ${collectionName}`);
      }
    } catch (error) {
      logger.error(`Error batch deleting from ${collectionName}:`, error);
      throw error;
    }
  }

  async deleteAllUserData(): Promise<void> {
    if (!isFirebaseConfigured()) return;

    const collections: CollectionType[] = [
      'transactions',
      'budgets',
      'goals',
      'trips',
      'trip_expenses',
      'notifications',
      'vault'
    ]; // notification_preferences is sometimes single doc but usually stored in db as collection, double check logic used. 
    // db.ts uses 'notification_preferences' as object store. 
    // FirestoreSync doesn't explicitly have 'syncNotificationPreferences' but prepareForFirestore might handle generic?
    // Looking at the file, there are no sync methods for NotificationPreferences. 
    // However, the interface CollectionType includes 'notifications' and 'vault'.
    // Let's stick to the CollectionType definition.

    try {
      logger.debug('Starting full remote data wipe...');

      for (const col of collections) {
        const items = await this.fetchAll<{ id: string }>(col);
        const ids = items.map(i => i.id);
        if (ids.length > 0) {
          await this.batchDelete(col, ids);
        }
      }
      logger.debug('Remote data wipe completed');
    } catch (error) {
      logger.error('Error wiping remote data:', error);
      throw error;
    }
  }
}

let firestoreSyncInstance: FirestoreSync | null = null;

export const getFirestoreSync = (userId: string): FirestoreSync => {
  if (!firestoreSyncInstance || (firestoreSyncInstance as any).userId !== userId) {
    if (firestoreSyncInstance) {
      firestoreSyncInstance.unsubscribeAll();
    }
    firestoreSyncInstance = new FirestoreSync(userId);
  }
  return firestoreSyncInstance;
};

export const clearFirestoreSync = (): void => {
  if (firestoreSyncInstance) {
    firestoreSyncInstance.unsubscribeAll();
    firestoreSyncInstance = null;
  }
};

export const updateUserProfile = async (
  userId: string,
  profileData: { name?: string; email?: string; photoURL?: string }
): Promise<void> => {
  if (!isFirebaseConfigured()) {
    logger.debug('Firebase not configured, skipping user profile update');
    return;
  }

  try {
    const db = getFirebaseDb();
    if (!db) {
      logger.debug('Firestore not initialized');
      return;
    }

    const userDocRef = doc(db, 'users', userId);
    const updateData = {
      ...profileData,
      updatedAt: serverTimestamp()
    };

    await setDoc(userDocRef, updateData, { merge: true });
    logger.debug('User profile updated in Firestore:', userId);
  } catch (error) {
    logger.error('Error updating user profile in Firestore:', error);
    throw error;
  }
};

export const getUserProfile = async (userId: string): Promise<{ name?: string; email?: string; photoURL?: string } | null> => {
  if (!isFirebaseConfigured()) {
    return null;
  }

  try {
    const db = getFirebaseDb();
    if (!db) {
      return null;
    }

    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      return userDoc.data() as { name?: string; email?: string; photoURL?: string };
    }
    return null;
  } catch (error) {
    logger.error('Error fetching user profile from Firestore:', error);
    return null;
  }
};
