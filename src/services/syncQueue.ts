import { openDB } from 'idb';
import type { IDBPDatabase, DBSchema } from 'idb';
import { logger } from '../utils/logger';
import { getFirestoreSync } from './firestoreSync';
import { isFirebaseConfigured } from '../config/firebase';

interface SyncOperation {
  id: string;
  operation: 'add' | 'update' | 'delete';
  collection: 'transactions' | 'budgets' | 'goals' | 'vault' | 'trips' | 'trip_expenses';
  data: any;
  timestamp: Date;
  retryCount: number;
  lastError?: string;
  status: 'pending' | 'processing' | 'failed' | 'success';
  userId?: string;
}

interface SyncQueueDB extends DBSchema {
  syncQueue: {
    key: string;
    value: SyncOperation;
    indexes: { 'by-status': string; 'by-timestamp': Date };
  };
}

class SyncQueueService {
  private db: IDBPDatabase<SyncQueueDB> | null = null;
  private isProcessing = false;
  private maxRetries = 5;
  private batchInterval = 3000;
  private batchTimer: number | null = null;
  private listeners: Set<(queue: SyncOperation[]) => void> = new Set();
  private currentUserId: string | null = null;

  async init() {
    if (this.db) return;

    this.db = await openDB<SyncQueueDB>('sync-queue-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('syncQueue')) {
          const store = db.createObjectStore('syncQueue', { keyPath: 'id' });
          store.createIndex('by-status', 'status');
          store.createIndex('by-timestamp', 'timestamp');
        }
      }
    });

    logger.debug('SyncQueue initialized');
  }

  setUser(userId: string | null) {
    this.currentUserId = userId;
  }

  async enqueue(
    operation: 'add' | 'update' | 'delete',
    collection: 'transactions' | 'budgets' | 'goals' | 'vault' | 'trips' | 'trip_expenses',
    data: any
  ): Promise<string> {
    await this.init();

    const syncOp: SyncOperation = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      operation,
      collection,
      data,
      timestamp: new Date(),
      retryCount: 0,
      status: 'pending',
      userId: this.currentUserId || undefined
    };

    await this.db!.put('syncQueue', syncOp);
    logger.debug('Enqueued sync operation:', syncOp.id);

    this.notifyListeners();
    this.scheduleBatchProcess();

    return syncOp.id;
  }

  private scheduleBatchProcess() {
    if (this.batchTimer !== null) {
      return;
    }

    this.batchTimer = window.setTimeout(() => {
      this.batchTimer = null;
      this.processBatch();
    }, this.batchInterval);
  }

  private async processBatch() {
    if (this.isProcessing || !navigator.onLine || !isFirebaseConfigured()) {
      logger.debug('Skipping batch process - already processing, offline, or Firebase not configured');
      return;
    }

    this.isProcessing = true;

    try {
      await this.init();
      const pending = await this.db!.getAllFromIndex('syncQueue', 'by-status', 'pending');

      if (pending.length === 0) {
        logger.debug('No pending operations');
        this.isProcessing = false;
        return;
      }

      logger.debug(`Processing ${pending.length} pending operations`);

      const grouped = pending.reduce((acc, op) => {
        if (!acc[op.collection]) acc[op.collection] = [];
        acc[op.collection].push(op);
        return acc;
      }, {} as Record<string, SyncOperation[]>);

      for (const [collection, operations] of Object.entries(grouped)) {
        await this.processBatchForCollection(collection as any, operations);
      }

      this.notifyListeners();
    } catch (error) {
      logger.error('Error processing batch:', error);
    } finally {
      this.isProcessing = false;

      const remainingPending = await this.db!.getAllFromIndex('syncQueue', 'by-status', 'pending');
      if (remainingPending.length > 0) {
        this.scheduleBatchProcess();
      }
    }
  }

  private async processBatchForCollection(_collection: string, operations: SyncOperation[]) {
    for (const op of operations) {
      try {
        op.status = 'processing';
        await this.db!.put('syncQueue', op);

        await this.processOperation(op);

        await this.db!.delete('syncQueue', op.id);
        logger.debug('Successfully processed:', op.id);
      } catch (error: any) {
        logger.error(`Error processing operation ${op.id}:`, error);

        op.retryCount++;
        op.lastError = error.message;

        if (op.retryCount >= this.maxRetries) {
          op.status = 'failed';
          logger.error(`Operation ${op.id} failed after ${this.maxRetries} retries`);
        } else {
          op.status = 'pending';
          logger.debug(`Will retry operation ${op.id} (attempt ${op.retryCount + 1})`);
        }

        await this.db!.put('syncQueue', op);
      }
    }
  }

  private async processOperation(op: SyncOperation): Promise<void> {
    if (!isFirebaseConfigured() || !op.userId) {
      logger.debug('Sync operation skipped - Firebase not configured or no user');
      return;
    }

    const firestoreSync = getFirestoreSync(op.userId);

    switch (op.operation) {
      case 'add':
      case 'update':
        await firestoreSync.saveDocument(op.collection, op.data);
        break;
      case 'delete':
        await firestoreSync.deleteDocument(op.collection, op.data.id);
        break;
    }
  }

  async retryFailed() {
    await this.init();
    const failed = await this.db!.getAllFromIndex('syncQueue', 'by-status', 'failed');
    
    for (const op of failed) {
      op.status = 'pending';
      op.retryCount = 0;
      await this.db!.put('syncQueue', op);
    }

    logger.debug(`Reset ${failed.length} failed operations for retry`);
    this.notifyListeners();
    this.scheduleBatchProcess();
  }

  async getQueue(): Promise<SyncOperation[]> {
    await this.init();
    return this.db!.getAll('syncQueue');
  }

  async getPendingCount(): Promise<number> {
    await this.init();
    const pending = await this.db!.getAllFromIndex('syncQueue', 'by-status', 'pending');
    return pending.length;
  }

  subscribe(callback: (queue: SyncOperation[]) => void) {
    this.listeners.add(callback);
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  private async notifyListeners() {
    const queue = await this.getQueue();
    this.listeners.forEach(callback => callback(queue));
  }

  startAutoSync() {
    const checkAndSync = async () => {
      if (navigator.onLine && !this.isProcessing && isFirebaseConfigured()) {
        await this.processBatch();
      }
    };

    checkAndSync();

    const intervalId = setInterval(checkAndSync, 30000);

    const onlineHandler = () => {
      logger.debug('Network back online - processing queue');
      checkAndSync();
    };
    window.addEventListener('online', onlineHandler);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('online', onlineHandler);
    };
  }
}

export const syncQueue = new SyncQueueService();
