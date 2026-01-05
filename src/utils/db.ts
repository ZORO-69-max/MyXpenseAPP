import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { Transaction, Budget, Goal, Trip, TripExpense, Notification } from '../types';

export interface SecretVault {
  id: string;
  userId: string;
  pinHash: string;
  pinSalt: string;
  secretQuestion: string;
  secretAnswerHash: string;
  secretAnswerSalt?: string;
  vaultBalanceEncrypted: string;
  vaultHistory: VaultTransaction[];
  createdAt: Date;
  updatedAt: Date;
}

export interface VaultTransaction {
  id: string;
  type: 'add' | 'withdraw' | 'transfer';
  amount: number;
  date: Date;
  note?: string;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  daysOfWeek: number[]; // 0-6, Sunday to Saturday
  reminderTime: string; // HH:mm format
  settlementReminderDays?: number; // Days before reminding about settlement (default 7)
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface MyXpenseDB extends DBSchema {
  transactions: {
    key: string;
    value: Transaction;
    indexes: { 'by-date': Date; 'by-userId': string; 'by-type': string };
  };
  budgets: {
    key: string;
    value: Budget;
    indexes: { 'by-userId': string };
  };
  goals: {
    key: string;
    value: Goal;
    indexes: { 'by-userId': string };
  };
  sync_queue: {
    key: string;
    value: {
      id: string;
      operation: 'add' | 'update' | 'delete';
      collection: 'transactions' | 'budgets' | 'goals';
      data: Transaction | Budget | Goal;
      timestamp: Date;
    };
  };
  secret_vault: {
    key: string;
    value: SecretVault;
    indexes: { 'by-userId': string };
  };
  notification_preferences: {
    key: string;
    value: NotificationPreferences;
    indexes: { 'by-userId': string };
  };
  notifications: {
    key: string;
    value: Notification;
    indexes: { 'by-userId': string; 'by-read': IDBValidKey; 'by-date': Date };
  };
  trips: {
    key: string;
    value: Trip;
    indexes: { 'by-userId': string; 'by-date': Date };
  };
  trip_expenses: {
    key: string;
    value: TripExpense;
    indexes: { 'by-tripId': string; 'by-date': Date };
  };
}

let dbPromise: Promise<IDBPDatabase<MyXpenseDB>> | null = null;

export const getDB = async () => {
  if (!dbPromise) {
    dbPromise = openDB<MyXpenseDB>('myxpense-db', 4, {
      upgrade(db, oldVersion) {
        // Transactions store
        if (!db.objectStoreNames.contains('transactions')) {
          const transactionStore = db.createObjectStore('transactions', { keyPath: 'id' });
          transactionStore.createIndex('by-date', 'date');
          transactionStore.createIndex('by-userId', 'userId');
          transactionStore.createIndex('by-type', 'type');
        }

        // Budgets store
        if (!db.objectStoreNames.contains('budgets')) {
          const budgetStore = db.createObjectStore('budgets', { keyPath: 'id' });
          budgetStore.createIndex('by-userId', 'userId');
        }

        // Goals store
        if (!db.objectStoreNames.contains('goals')) {
          const goalStore = db.createObjectStore('goals', { keyPath: 'id' });
          goalStore.createIndex('by-userId', 'userId');
        }

        // Sync queue for offline operations
        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'id' });
        }

        // Secret vault store (v2)
        if (oldVersion < 2 && !db.objectStoreNames.contains('secret_vault')) {
          const vaultStore = db.createObjectStore('secret_vault', { keyPath: 'id' });
          vaultStore.createIndex('by-userId', 'userId');
        }

        // Notification preferences store (v2)
        if (oldVersion < 2 && !db.objectStoreNames.contains('notification_preferences')) {
          const notifStore = db.createObjectStore('notification_preferences', { keyPath: 'id' });
          notifStore.createIndex('by-userId', 'userId');
        }

        // Notifications store (v3)
        if (oldVersion < 3 && !db.objectStoreNames.contains('notifications')) {
          const notifStore = db.createObjectStore('notifications', { keyPath: 'id' });
          notifStore.createIndex('by-userId', 'userId');
          notifStore.createIndex('by-read', 'read');
          notifStore.createIndex('by-date', 'createdAt');
        }

        // Trips store (v4)
        if (oldVersion < 4 && !db.objectStoreNames.contains('trips')) {
          const tripsStore = db.createObjectStore('trips', { keyPath: 'id' });
          tripsStore.createIndex('by-userId', 'userId');
          tripsStore.createIndex('by-date', 'createdAt');
        }

        // Trip expenses store (v4)
        if (oldVersion < 4 && !db.objectStoreNames.contains('trip_expenses')) {
          const tripExpensesStore = db.createObjectStore('trip_expenses', { keyPath: 'id' });
          tripExpensesStore.createIndex('by-tripId', 'tripId');
          tripExpensesStore.createIndex('by-date', 'date');
        }
      }
    });
  }
  return dbPromise;
};

// Transaction operations
export const saveTransaction = async (transaction: Transaction) => {
  const db = await getDB();
  await db.put('transactions', transaction);
};

export const getTransactions = async (userId: string): Promise<Transaction[]> => {
  const db = await getDB();
  return db.getAllFromIndex('transactions', 'by-userId', userId);
};

export const getTransactionsByType = async (userId: string, type: 'income' | 'expense'): Promise<Transaction[]> => {
  const db = await getDB();
  const allTransactions = await db.getAllFromIndex('transactions', 'by-userId', userId);
  return allTransactions.filter(t => t.type === type);
};

export const deleteTransaction = async (id: string) => {
  const db = await getDB();
  await db.delete('transactions', id);
};

// Budget operations
export const saveBudget = async (budget: Budget) => {
  const db = await getDB();
  await db.put('budgets', budget);
};

export const getBudgets = async (userId: string): Promise<Budget[]> => {
  const db = await getDB();
  return db.getAllFromIndex('budgets', 'by-userId', userId);
};

export const deleteBudget = async (id: string) => {
  const db = await getDB();
  await db.delete('budgets', id);
};

// Goal operations
export const saveGoal = async (goal: Goal) => {
  const db = await getDB();
  await db.put('goals', goal);
};

export const getGoals = async (userId: string): Promise<Goal[]> => {
  const db = await getDB();
  return db.getAllFromIndex('goals', 'by-userId', userId);
};

export const deleteGoal = async (id: string) => {
  const db = await getDB();
  await db.delete('goals', id);
};

// Sync queue operations
export const addToSyncQueue = async (operation: 'add' | 'update' | 'delete', collection: 'transactions' | 'budgets' | 'goals', data: Transaction | Budget | Goal) => {
  const db = await getDB();
  const queueItem = {
    id: `${collection}_${Date.now()}_${Math.random()}`,
    operation,
    collection,
    data,
    timestamp: new Date()
  };
  await db.put('sync_queue', queueItem);
};

export const getSyncQueue = async () => {
  const db = await getDB();
  return db.getAll('sync_queue');
};

export const clearSyncQueue = async () => {
  const db = await getDB();
  const tx = db.transaction('sync_queue', 'readwrite');
  await tx.store.clear();
  await tx.done;
};

// Secret vault operations
export const saveSecretVault = async (vault: SecretVault) => {
  const db = await getDB();
  await db.put('secret_vault', vault);
};

export const getSecretVault = async (userId: string): Promise<SecretVault | undefined> => {
  const db = await getDB();
  const vaults = await db.getAllFromIndex('secret_vault', 'by-userId', userId);
  return vaults[0];
};

export const deleteSecretVault = async (id: string) => {
  const db = await getDB();
  await db.delete('secret_vault', id);
};

// Notification preferences operations
export const saveNotificationPreferences = async (prefs: NotificationPreferences) => {
  const db = await getDB();
  await db.put('notification_preferences', prefs);
};

export const getNotificationPreferences = async (userId: string): Promise<NotificationPreferences | undefined> => {
  const db = await getDB();
  const prefs = await db.getAllFromIndex('notification_preferences', 'by-userId', userId);
  return prefs[0];
};

export const deleteNotificationPreferences = async (id: string) => {
  const db = await getDB();
  await db.delete('notification_preferences', id);
};

// Notification operations
export const saveNotification = async (notification: Notification) => {
  const db = await getDB();
  await db.put('notifications', notification);
};

export const getNotifications = async (userId: string): Promise<Notification[]> => {
  const db = await getDB();
  const notifications = await db.getAllFromIndex('notifications', 'by-userId', userId);
  return notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

export const getUnreadNotifications = async (userId: string): Promise<Notification[]> => {
  const db = await getDB();
  const notifications = await db.getAllFromIndex('notifications', 'by-userId', userId);
  return notifications.filter(n => !n.read).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

export const markNotificationAsRead = async (id: string) => {
  const db = await getDB();
  const notification = await db.get('notifications', id);
  if (notification) {
    notification.read = true;
    await db.put('notifications', notification);
  }
};

export const markAllNotificationsAsRead = async (userId: string) => {
  const db = await getDB();
  const notifications = await db.getAllFromIndex('notifications', 'by-userId', userId);
  const tx = db.transaction('notifications', 'readwrite');
  await Promise.all(
    notifications.map(n => {
      n.read = true;
      return tx.store.put(n);
    })
  );
  await tx.done;
};

export const deleteNotification = async (id: string) => {
  const db = await getDB();
  await db.delete('notifications', id);
};

// Trip operations
export const saveTrip = async (trip: Trip) => {
  const db = await getDB();
  await db.put('trips', trip);
};

export const getTrips = async (userId: string): Promise<Trip[]> => {
  const db = await getDB();
  const trips = await db.getAllFromIndex('trips', 'by-userId', userId);
  return trips.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

export const deleteTrip = async (id: string) => {
  const db = await getDB();
  await db.delete('trips', id);
};

// Trip expense operations
export const saveTripExpense = async (expense: TripExpense) => {
  const db = await getDB();
  await db.put('trip_expenses', expense);
};

export const getTripExpenses = async (tripId: string): Promise<TripExpense[]> => {
  const db = await getDB();
  const expenses = await db.getAllFromIndex('trip_expenses', 'by-tripId', tripId);
  return expenses.sort((a, b) => b.date.getTime() - a.date.getTime());
};

export const deleteTripExpense = async (id: string) => {
  const db = await getDB();
  await db.delete('trip_expenses', id);
};

// Clear all data (for logout)
export const clearAllData = async () => {
  const db = await getDB();
  const tx = db.transaction(['transactions', 'budgets', 'goals', 'sync_queue', 'secret_vault', 'notification_preferences', 'notifications', 'trips', 'trip_expenses'], 'readwrite');
  await Promise.all([
    tx.objectStore('transactions').clear(),
    tx.objectStore('budgets').clear(),
    tx.objectStore('goals').clear(),
    tx.objectStore('sync_queue').clear(),
    tx.objectStore('secret_vault').clear(),
    tx.objectStore('notification_preferences').clear(),
    tx.objectStore('notifications').clear(),
    tx.objectStore('trips').clear(),
    tx.objectStore('trip_expenses').clear()
  ]);
  await tx.done;
};
