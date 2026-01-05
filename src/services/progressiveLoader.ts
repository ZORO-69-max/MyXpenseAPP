import { logger } from '../utils/logger';
import {
  getTransactions,
  getBudgets,
  getGoals,
  getTrips,
  getTripExpenses,
  getSecretVault,
  getNotifications,
  getNotificationPreferences,
  saveTransaction,
  saveBudget,
  saveGoal,
  saveTrip
} from '../utils/db';
import { getFirestoreSync } from './firestoreSync';
import { isFirebaseConfigured } from '../config/firebase';
import { encryptedVaultSync } from './encryptedVaultSync';
import type { Transaction, Budget, Goal, Trip, TripExpense } from '../types';
import type { SecretVault } from '../utils/db';

export interface LoadProgress {
  stage: LoadStage;
  progress: number;
  message: string;
  dataLoaded: {
    transactions: boolean;
    budgets: boolean;
    goals: boolean;
    trips: boolean;
    vault: boolean;
    notifications: boolean;
  };
}

export type LoadStage = 'initializing' | 'local' | 'syncing' | 'vault_prompt' | 'complete';

export interface LoadedData {
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  trips: Trip[];
  tripExpenses: Map<string, TripExpense[]>;
  vault: SecretVault | null;
  vaultNeedsRestore: boolean;
  loadTime: number;
}

type ProgressCallback = (progress: LoadProgress) => void;

class ProgressiveLoaderService {
  private userId: string | null = null;
  private progressListeners: Set<ProgressCallback> = new Set();
  private loadedData: LoadedData | null = null;

  setUser(userId: string | null) {
    this.userId = userId;
    this.loadedData = null;
  }

  subscribe(callback: ProgressCallback): () => void {
    this.progressListeners.add(callback);
    return () => this.progressListeners.delete(callback);
  }

  private notifyProgress(progress: LoadProgress) {
    this.progressListeners.forEach(callback => callback(progress));
  }

  async loadData(): Promise<LoadedData> {
    if (!this.userId) {
      throw new Error('No user set for progressive loader');
    }

    const startTime = performance.now();

    this.notifyProgress({
      stage: 'initializing',
      progress: 0,
      message: 'Starting...',
      dataLoaded: {
        transactions: false,
        budgets: false,
        goals: false,
        trips: false,
        vault: false,
        notifications: false
      }
    });

    const localData = await this.loadFromIndexedDB();

    this.notifyProgress({
      stage: 'local',
      progress: 50,
      message: 'Local data loaded',
      dataLoaded: {
        transactions: true,
        budgets: true,
        goals: true,
        trips: true,
        vault: !!localData.vault,
        notifications: true
      }
    });

    this.loadedData = {
      ...localData,
      loadTime: performance.now() - startTime
    };

    if (isFirebaseConfigured() && navigator.onLine) {
      this.syncFromFirebaseInBackground();
    }

    this.notifyProgress({
      stage: 'complete',
      progress: 100,
      message: 'Ready',
      dataLoaded: {
        transactions: true,
        budgets: true,
        goals: true,
        trips: true,
        vault: !!localData.vault,
        notifications: true
      }
    });

    logger.debug(`Data loaded in ${this.loadedData.loadTime.toFixed(2)}ms`);
    return this.loadedData;
  }

  private async loadFromIndexedDB(): Promise<Omit<LoadedData, 'loadTime'>> {
    const [
      transactions,
      budgets,
      goals,
      trips,
      vault,
      _notifications,
      _notificationPrefs
    ] = await Promise.all([
      getTransactions(this.userId!),
      getBudgets(this.userId!),
      getGoals(this.userId!),
      getTrips(this.userId!),
      getSecretVault(this.userId!),
      getNotifications(this.userId!),
      getNotificationPreferences(this.userId!)
    ]);

    const tripExpenses = new Map<string, TripExpense[]>();
    await Promise.all(
      trips.map(async (trip) => {
        const expenses = await getTripExpenses(trip.id);
        tripExpenses.set(trip.id, expenses);
      })
    );

    let vaultNeedsRestore = false;
    if (!vault && isFirebaseConfigured()) {
      vaultNeedsRestore = await encryptedVaultSync.checkVaultExistsInFirebase(this.userId!);
    }

    logger.debug(`Loaded from IndexedDB: ${transactions.length} transactions, ${trips.length} trips`);

    return {
      transactions,
      budgets,
      goals,
      trips,
      tripExpenses,
      vault: vault || null,
      vaultNeedsRestore
    };
  }

  private async syncFromFirebaseInBackground(): Promise<void> {
    if (!this.userId || !this.loadedData) return;

    this.notifyProgress({
      stage: 'syncing',
      progress: 75,
      message: 'Syncing with cloud...',
      dataLoaded: {
        transactions: true,
        budgets: true,
        goals: true,
        trips: true,
        vault: !!this.loadedData.vault,
        notifications: true
      }
    });

    try {
      const firestoreSync = getFirestoreSync(this.userId);

      const [
        cloudTransactions,
        cloudBudgets,
        cloudGoals,
        cloudTrips
      ] = await Promise.all([
        firestoreSync.fetchAll<Transaction>('transactions'),
        firestoreSync.fetchAll<Budget>('budgets'),
        firestoreSync.fetchAll<Goal>('goals'),
        firestoreSync.fetchAll<Trip>('trips')
      ]);

      await this.mergeCloudData(
        cloudTransactions,
        cloudBudgets,
        cloudGoals,
        cloudTrips
      );

      logger.debug('Background sync completed');
    } catch (error) {
      logger.error('Background sync failed:', error);
    }
  }

  private async mergeCloudData(
    cloudTransactions: Transaction[],
    cloudBudgets: Budget[],
    cloudGoals: Goal[],
    cloudTrips: Trip[]
  ): Promise<void> {
    if (!this.loadedData) return;

    const merged = {
      transactions: this.mergeItems(this.loadedData.transactions, cloudTransactions, 2),
      budgets: this.mergeItems(this.loadedData.budgets, cloudBudgets, 3),
      goals: this.mergeItems(this.loadedData.goals, cloudGoals, 3),
      trips: this.mergeItems(this.loadedData.trips, cloudTrips, 2)
    };

    const newTransactions = merged.transactions.filter(
      item => !this.loadedData!.transactions.find(t => t.id === item.id)
    );
    const newBudgets = merged.budgets.filter(
      item => !this.loadedData!.budgets.find(b => b.id === item.id)
    );
    const newGoals = merged.goals.filter(
      item => !this.loadedData!.goals.find(g => g.id === item.id)
    );
    const newTrips = merged.trips.filter(
      item => !this.loadedData!.trips.find(t => t.id === item.id)
    );

    await Promise.all([
      ...newTransactions.map(t => saveTransaction(t)),
      ...newBudgets.map(b => saveBudget(b)),
      ...newGoals.map(g => saveGoal(g)),
      ...newTrips.map(t => saveTrip(t))
    ]);

    this.loadedData.transactions = merged.transactions;
    this.loadedData.budgets = merged.budgets;
    this.loadedData.goals = merged.goals;
    this.loadedData.trips = merged.trips;
  }

  private mergeItems<T extends { id: string; updatedAt?: Date; syncMetadata?: any }>(
    local: T[],
    cloud: T[],
    tier: number = 2
  ): T[] {
    const merged = new Map<string, T>();

    local.forEach(item => merged.set(item.id, item));

    cloud.forEach(cloudItem => {
      const localItem = merged.get(cloudItem.id);
      
      if (!localItem) {
        const itemWithMetadata = {
          ...cloudItem,
          syncMetadata: {
            lastSyncedAt: new Date(),
            syncVersion: Date.now(),
            tier,
            pendingSync: false
          }
        };
        merged.set(cloudItem.id, itemWithMetadata as T);
      } else {
        if ((localItem as any).syncMetadata?.pendingSync) {
          return;
        }
        
        const localTime = localItem.updatedAt ? new Date(localItem.updatedAt).getTime() : 0;
        const cloudTime = cloudItem.updatedAt ? new Date(cloudItem.updatedAt).getTime() : 0;
        
        if (cloudTime > localTime) {
          const itemWithMetadata = {
            ...cloudItem,
            syncMetadata: {
              lastSyncedAt: new Date(),
              syncVersion: Date.now(),
              tier,
              pendingSync: false
            }
          };
          merged.set(cloudItem.id, itemWithMetadata as T);
        }
      }
    });

    return Array.from(merged.values());
  }

  async restoreVaultFromCloud(pin: string): Promise<SecretVault | null> {
    if (!this.userId) return null;

    try {
      const vault = await encryptedVaultSync.restoreVaultFromFirebase(
        this.userId,
        pin
      );

      if (vault && this.loadedData) {
        this.loadedData.vault = vault;
        this.loadedData.vaultNeedsRestore = false;
      }

      return vault;
    } catch (error) {
      logger.error('Failed to restore vault from cloud:', error);
      throw error;
    }
  }

  getLoadedData(): LoadedData | null {
    return this.loadedData;
  }

  async refreshData(): Promise<LoadedData> {
    this.loadedData = null;
    return this.loadData();
  }

  getPerformanceMetrics(): {
    loadTime: number;
    dataCount: {
      transactions: number;
      budgets: number;
      goals: number;
      trips: number;
    };
  } | null {
    if (!this.loadedData) return null;

    return {
      loadTime: this.loadedData.loadTime,
      dataCount: {
        transactions: this.loadedData.transactions.length,
        budgets: this.loadedData.budgets.length,
        goals: this.loadedData.goals.length,
        trips: this.loadedData.trips.length
      }
    };
  }
}

export const progressiveLoader = new ProgressiveLoaderService();
