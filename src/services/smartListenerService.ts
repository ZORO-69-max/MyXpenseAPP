import { logger } from '../utils/logger';
import { getFirestoreSync } from './firestoreSync';
import { isFirebaseConfigured } from '../config/firebase';
import { saveTransaction, saveBudget, saveGoal, saveTrip, saveTripExpense } from '../utils/db';
import type { Transaction, Budget, Goal, Trip, TripExpense } from '../types';

type CollectionType = 'transactions' | 'budgets' | 'goals' | 'trips' | 'trip_expenses' | 'notifications';

interface ListenerInfo {
  collection: CollectionType;
  unsubscribe: () => void;
  viewId: string;
  createdAt: Date;
  lastDataReceived?: Date;
}

interface ViewSubscription {
  viewId: string;
  collections: CollectionType[];
  callback: (collection: CollectionType, data: any[]) => void;
  options?: { limit?: number };
}

class SmartListenerService {
  private userId: string | null = null;
  private activeListeners: Map<string, ListenerInfo> = new Map();
  private viewSubscriptions: Map<string, ViewSubscription> = new Map();
  private dataCache: Map<CollectionType, { data: any[]; timestamp: number }> = new Map();
  private cacheMaxAge = 30000;

  setUser(userId: string | null) {
    if (this.userId !== userId) {
      this.unsubscribeAll();
      this.userId = userId;
      this.dataCache.clear();
    }
  }

  subscribeToView(
    viewId: string,
    collections: CollectionType[],
    callback: (collection: CollectionType, data: any[]) => void,
    options: { limit?: number } = {}
  ): () => void {
    if (!this.userId || !isFirebaseConfigured()) {
      return () => { };
    }

    this.viewSubscriptions.set(viewId, {
      viewId,
      collections,
      callback,
      options
    });

    collections.forEach(collection => {
      this.ensureListener(collection, viewId, options);
    });

    logger.debug(`View ${viewId} subscribed to: ${collections.join(', ')}`);

    return () => this.unsubscribeFromView(viewId);
  }

  private ensureListener(collection: CollectionType, viewId: string, options: { limit?: number } = {}): void {
    const listenerKey = `${collection}`;

    if (this.activeListeners.has(listenerKey)) {
      const cached = this.dataCache.get(collection);
      if (cached && Date.now() - cached.timestamp < this.cacheMaxAge) {
        const subscription = this.viewSubscriptions.get(viewId);
        if (subscription) {
          subscription.callback(collection, cached.data);
        }
      }
      return;
    }

    const firestoreSync = getFirestoreSync(this.userId!);

    const unsubscribe = firestoreSync.subscribeToCollection(
      collection,
      (data: any[]) => {
        this.handleDataUpdate(collection, data);
      },
      options
    );

    this.activeListeners.set(listenerKey, {
      collection,
      unsubscribe,
      viewId,
      createdAt: new Date()
    });

    logger.debug(`Created listener for ${collection}`);
  }

  private handleDataUpdate(collection: CollectionType, data: any[]): void {
    this.dataCache.set(collection, {
      data,
      timestamp: Date.now()
    });

    const listener = this.activeListeners.get(collection);
    if (listener) {
      listener.lastDataReceived = new Date();
    }

    this.viewSubscriptions.forEach(subscription => {
      if (subscription.collections.includes(collection)) {
        subscription.callback(collection, data);
      }
    });

    this.persistToIndexedDB(collection, data);
  }

  private async persistToIndexedDB(collection: CollectionType, cloudData: any[]): Promise<void> {
    try {
      const savePromises = cloudData.map(async (cloudItem) => {
        const localItem = await this.getLocalItem(collection, cloudItem.id);

        if (localItem && localItem.syncMetadata?.pendingSync) {
          const localTime = localItem.updatedAt ? new Date(localItem.updatedAt).getTime() : 0;
          const cloudTime = cloudItem.updatedAt ? new Date(cloudItem.updatedAt).getTime() : 0;

          if (localTime > cloudTime) {
            logger.debug(`Skipping cloud update for ${collection}:${cloudItem.id} - local version is newer and pending sync`);
            return;
          }
        }

        const itemWithMetadata = {
          ...cloudItem,
          syncMetadata: {
            lastSyncedAt: new Date(),
            syncVersion: cloudItem.syncMetadata?.syncVersion || Date.now(),
            tier: cloudItem.syncMetadata?.tier || 2,
            pendingSync: false
          }
        };

        switch (collection) {
          case 'transactions':
            return saveTransaction(itemWithMetadata as Transaction);
          case 'budgets':
            return saveBudget(itemWithMetadata as Budget);
          case 'goals':
            return saveGoal(itemWithMetadata as Goal);
          case 'trips':
            return saveTrip(itemWithMetadata as Trip);
          case 'trip_expenses':
            return saveTripExpense(itemWithMetadata as TripExpense);
          default:
            return Promise.resolve();
        }
      });

      await Promise.all(savePromises);
      logger.debug(`Persisted ${cloudData.length} items from ${collection} to IndexedDB with conflict detection`);
    } catch (error) {
      logger.error(`Failed to persist ${collection} to IndexedDB:`, error);
    }
  }

  private async getLocalItem(collection: CollectionType, id: string): Promise<any> {
    try {
      const { getDB } = await import('../utils/db');
      const db = await getDB();

      switch (collection) {
        case 'transactions':
          return db.get('transactions', id);
        case 'budgets':
          return db.get('budgets', id);
        case 'goals':
          return db.get('goals', id);
        case 'trips':
          return db.get('trips', id);
        case 'trip_expenses':
          return db.get('trip_expenses', id);
        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  private unsubscribeFromView(viewId: string): void {
    const subscription = this.viewSubscriptions.get(viewId);
    if (!subscription) return;

    this.viewSubscriptions.delete(viewId);

    subscription.collections.forEach(collection => {
      const stillNeeded = Array.from(this.viewSubscriptions.values()).some(
        sub => sub.collections.includes(collection)
      );

      if (!stillNeeded) {
        this.removeListener(collection);
      }
    });

    logger.debug(`View ${viewId} unsubscribed`);
  }

  private removeListener(collection: CollectionType): void {
    const listenerKey = `${collection}`;
    const listener = this.activeListeners.get(listenerKey);

    if (listener) {
      listener.unsubscribe();
      this.activeListeners.delete(listenerKey);
      logger.debug(`Removed listener for ${collection}`);
    }
  }

  unsubscribeAll(): void {
    this.activeListeners.forEach(listener => {
      listener.unsubscribe();
    });
    this.activeListeners.clear();
    this.viewSubscriptions.clear();
    logger.debug('All listeners unsubscribed');
  }

  getCachedData<T>(collection: CollectionType): T[] | null {
    const cached = this.dataCache.get(collection);
    if (cached && Date.now() - cached.timestamp < this.cacheMaxAge) {
      return cached.data as T[];
    }
    return null;
  }

  invalidateCache(collection?: CollectionType): void {
    if (collection) {
      this.dataCache.delete(collection);
    } else {
      this.dataCache.clear();
    }
  }

  getActiveListeners(): {
    collection: CollectionType;
    viewId: string;
    age: number;
    lastData?: Date;
  }[] {
    return Array.from(this.activeListeners.values()).map(listener => ({
      collection: listener.collection,
      viewId: listener.viewId,
      age: Date.now() - listener.createdAt.getTime(),
      lastData: listener.lastDataReceived
    }));
  }

  getStats(): {
    activeListeners: number;
    activeViews: number;
    cachedCollections: number;
    totalCachedItems: number;
  } {
    let totalCachedItems = 0;
    this.dataCache.forEach(cache => {
      totalCachedItems += cache.data.length;
    });

    return {
      activeListeners: this.activeListeners.size,
      activeViews: this.viewSubscriptions.size,
      cachedCollections: this.dataCache.size,
      totalCachedItems
    };
  }

  setCacheMaxAge(maxAgeMs: number): void {
    this.cacheMaxAge = maxAgeMs;
  }

  forceRefresh(collection: CollectionType): void {
    this.dataCache.delete(collection);

    const listener = this.activeListeners.get(collection);
    if (listener) {
      listener.unsubscribe();
      this.activeListeners.delete(collection);

      this.viewSubscriptions.forEach(subscription => {
        if (subscription.collections.includes(collection)) {
          this.ensureListener(collection, subscription.viewId);
        }
      });
    }
  }
}

export const smartListenerService = new SmartListenerService();
