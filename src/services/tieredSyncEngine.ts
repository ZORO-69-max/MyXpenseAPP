import { logger } from '../utils/logger';
import { getFirestoreSync } from './firestoreSync';
import { isFirebaseConfigured } from '../config/firebase';
import {
  saveTransaction,
  saveBudget,
  saveGoal,
  saveTrip,
  saveTripExpense
} from '../utils/db';
import type { Transaction, Budget, Goal, Trip, TripExpense } from '../types';

export const SyncTier = {
  CRITICAL: 1,
  HIGH: 2,
  NORMAL: 3,
  LOW: 4
} as const;

export type SyncTier = typeof SyncTier[keyof typeof SyncTier];

export interface SyncableItem {
  id: string;
  syncMetadata?: SyncMetadata;
  [key: string]: any;
}

export interface SyncMetadata {
  lastSyncedAt: Date | null;
  syncVersion: number;
  tier: SyncTier;
  pendingSync: boolean;
  conflictResolution?: 'local' | 'remote' | 'manual';
}

interface TierConfig {
  tier: SyncTier;
  interval: number;
  batchSize: number;
  immediate: boolean;
}

interface QueuedOperation {
  id: string;
  collection: string;
  operation: 'save' | 'delete';
  data: any;
  tier: SyncTier;
  timestamp: number;
  retryCount: number;
}

const TIER_CONFIGS: Record<SyncTier, TierConfig> = {
  [SyncTier.CRITICAL]: {
    tier: SyncTier.CRITICAL,
    interval: 0,
    batchSize: 1,
    immediate: true
  },
  [SyncTier.HIGH]: {
    tier: SyncTier.HIGH,
    interval: 5000,
    batchSize: 10,
    immediate: false
  },
  [SyncTier.NORMAL]: {
    tier: SyncTier.NORMAL,
    interval: 30000,
    batchSize: 20,
    immediate: false
  },
  [SyncTier.LOW]: {
    tier: SyncTier.LOW,
    interval: 300000,
    batchSize: 50,
    immediate: false
  }
};

const COLLECTION_TIERS: Record<string, SyncTier> = {
  settlements: SyncTier.CRITICAL,
  vault: SyncTier.CRITICAL,
  transactions: SyncTier.HIGH,
  trip_expenses: SyncTier.HIGH,
  trips: SyncTier.HIGH,
  budgets: SyncTier.NORMAL,
  goals: SyncTier.NORMAL,
  notifications: SyncTier.LOW,
  notification_preferences: SyncTier.LOW,
  audit_logs: SyncTier.LOW
};

class TieredSyncEngine {
  private userId: string | null = null;
  private queues: Map<SyncTier, QueuedOperation[]> = new Map();
  private timers: Map<SyncTier, number> = new Map();
  private isProcessing: Map<SyncTier, boolean> = new Map();
  private networkSpeed: 'slow-2g' | '2g' | '3g' | '4g' | '5g' = '4g';
  private listeners: Set<(status: SyncStatus) => void> = new Set();
  private rateLimiter: RateLimiter;

  constructor() {
    this.rateLimiter = new RateLimiter(100, 60000);
    Object.values(SyncTier).forEach(tier => {
      if (typeof tier === 'number') {
        this.queues.set(tier, []);
        this.isProcessing.set(tier, false);
      }
    });
  }

  setUser(userId: string | null) {
    if (this.userId !== userId) {
      this.stopAllTimers();
      this.userId = userId;
      if (userId) {
        this.startAllTimers();
        this.detectNetworkSpeed();
      }
    }
  }

  private startAllTimers() {
    Object.values(SyncTier).forEach(tier => {
      if (typeof tier === 'number' && tier !== SyncTier.CRITICAL) {
        this.startTierTimer(tier);
      }
    });

    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        connection.addEventListener('change', () => this.detectNetworkSpeed());
      }
    }

    window.addEventListener('online', () => this.onNetworkOnline());
  }

  private stopAllTimers() {
    this.timers.forEach((timerId) => {
      clearInterval(timerId);
    });
    this.timers.clear();
    
    this.retryTimers.forEach((timerId) => {
      clearTimeout(timerId);
    });
    this.retryTimers.clear();
  }

  private startTierTimer(tier: SyncTier) {
    const config = TIER_CONFIGS[tier];
    if (config.immediate) return;

    const existingTimer = this.timers.get(tier);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    const timerId = window.setInterval(() => {
      this.processTierQueue(tier);
    }, config.interval);

    this.timers.set(tier, timerId);
  }

  private detectNetworkSpeed() {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection && connection.effectiveType) {
        this.networkSpeed = connection.effectiveType;
        logger.debug(`Network speed detected: ${this.networkSpeed}`);
      }
    }
  }

  private getAdaptiveBatchSize(tier: SyncTier): number {
    const baseBatchSize = TIER_CONFIGS[tier].batchSize;
    
    switch (this.networkSpeed) {
      case 'slow-2g':
        return Math.max(1, Math.floor(baseBatchSize * 0.2));
      case '2g':
        return Math.max(1, Math.floor(baseBatchSize * 0.3));
      case '3g':
        return Math.max(2, Math.floor(baseBatchSize * 0.5));
      case '4g':
        return baseBatchSize;
      case '5g':
        return Math.floor(baseBatchSize * 1.5);
      default:
        return baseBatchSize;
    }
  }

  private onNetworkOnline() {
    logger.debug('Network online - processing all queued operations');
    Object.values(SyncTier).forEach(tier => {
      if (typeof tier === 'number') {
        this.processTierQueue(tier);
      }
    });
  }

  async enqueue(
    collection: string,
    operation: 'save' | 'delete',
    data: any,
    customTier?: SyncTier
  ): Promise<void> {
    const tier = customTier ?? COLLECTION_TIERS[collection] ?? SyncTier.NORMAL;
    
    const queuedOp: QueuedOperation = {
      id: `${collection}_${data.id}_${Date.now()}`,
      collection,
      operation,
      data,
      tier,
      timestamp: Date.now(),
      retryCount: 0
    };

    const queue = this.queues.get(tier) || [];
    const existingIndex = queue.findIndex(
      op => op.collection === collection && op.data?.id === data.id
    );
    
    if (existingIndex >= 0) {
      queue[existingIndex] = queuedOp;
    } else {
      queue.push(queuedOp);
    }
    
    this.queues.set(tier, queue);
    this.notifyListeners();

    if (TIER_CONFIGS[tier].immediate && navigator.onLine) {
      await this.processTierQueue(tier);
    }

    logger.debug(`Enqueued ${operation} for ${collection} at tier ${tier}`);
  }

  private async processTierQueue(tier: SyncTier): Promise<void> {
    if (!this.userId || !navigator.onLine || !isFirebaseConfigured()) {
      return;
    }

    if (this.isProcessing.get(tier)) {
      return;
    }

    const queue = this.queues.get(tier) || [];
    if (queue.length === 0) {
      return;
    }

    if (!this.rateLimiter.canProceed()) {
      logger.debug(`Rate limit active for tier ${tier}, scheduling retry (queue preserved)`);
      this.scheduleRetry(tier);
      return;
    }

    this.isProcessing.set(tier, true);

    try {
      const remainingOps = this.rateLimiter.getRemainingOperations();
      if (remainingOps === 0) {
        this.scheduleRetry(tier);
        this.isProcessing.set(tier, false);
        return;
      }

      const batchSize = Math.min(this.getAdaptiveBatchSize(tier), remainingOps);
      const batch = queue.slice(0, batchSize);
      const firestoreSync = getFirestoreSync(this.userId);

      const results = await Promise.allSettled(
        batch.map(async (op) => {
          if (!this.rateLimiter.tryAcquire()) {
            throw new Error('RATE_LIMIT_EXCEEDED');
          }

          if (op.operation === 'save') {
            await firestoreSync.saveDocument(op.collection as any, op.data);
            await this.clearPendingSync(op.collection, op.data);
          } else if (op.operation === 'delete') {
            await firestoreSync.deleteDocument(op.collection as any, op.data.id);
          }

          return op.id;
        })
      );

      const failedOps: QueuedOperation[] = [];
      const rateLimitedOps: QueuedOperation[] = [];
      let successCount = 0;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successCount++;
        } else {
          const failedOp = batch[index];
          const error = result.reason;
          
          if (error?.message === 'RATE_LIMIT_EXCEEDED') {
            rateLimitedOps.push(failedOp);
          } else if (failedOp.retryCount < 5) {
            failedOp.retryCount++;
            failedOps.push(failedOp);
          } else {
            logger.error(`Operation failed after max retries: ${failedOp.id}`);
          }
        }
      });

      const notInBatch = queue.slice(batchSize);
      this.queues.set(tier, [...rateLimitedOps, ...failedOps, ...notInBatch]);

      if (successCount > 0) {
        logger.debug(`Synced ${successCount} operations at tier ${tier}`);
      }

      if (rateLimitedOps.length > 0 || failedOps.length > 0) {
        this.scheduleRetry(tier);
      }

      this.notifyListeners();
    } catch (error) {
      logger.error(`Error processing tier ${tier} queue:`, error);
    } finally {
      this.isProcessing.set(tier, false);
    }
  }

  private processAllQueuesLastRun = 0;
  private readonly PROCESS_ALL_COOLDOWN = 5000;
  private retryTimers: Map<SyncTier, number> = new Map();

  private scheduleRetry(tier: SyncTier): void {
    if (this.retryTimers.has(tier)) {
      return;
    }

    const timeUntilSlot = this.rateLimiter.getTimeUntilNextSlot();
    let backoffMs: number;
    
    if (tier === SyncTier.CRITICAL) {
      backoffMs = Math.max(20, timeUntilSlot + Math.random() * 20);
    } else if (tier === SyncTier.HIGH) {
      backoffMs = Math.max(1000, timeUntilSlot + 500 + Math.random() * 500);
    } else {
      backoffMs = Math.max(5000, timeUntilSlot + 2000 + Math.random() * 2000);
    }

    logger.debug(`Scheduling retry for tier ${tier} in ${Math.round(backoffMs)}ms (slot opens in ${timeUntilSlot}ms)`);
    
    const timerId = window.setTimeout(() => {
      this.retryTimers.delete(tier);
      this.processTierQueue(tier);
    }, backoffMs);

    this.retryTimers.set(tier, timerId);
  }

  async processAllQueues(): Promise<void> {
    const now = Date.now();
    if (now - this.processAllQueuesLastRun < this.PROCESS_ALL_COOLDOWN) {
      logger.debug('processAllQueues throttled - too frequent calls');
      return;
    }
    this.processAllQueuesLastRun = now;
    
    const tiers = [SyncTier.CRITICAL, SyncTier.HIGH, SyncTier.NORMAL, SyncTier.LOW];
    
    for (const tier of tiers) {
      if (!this.rateLimiter.canProceed()) {
        logger.debug(`Rate limit reached during processAllQueues at tier ${tier}`);
        break;
      }
      await this.processTierQueue(tier);
    }
  }

  getStatus(): SyncStatus {
    let totalPending = 0;
    let isAnyProcessing = false;

    this.queues.forEach((queue, tier) => {
      totalPending += queue.length;
      if (this.isProcessing.get(tier)) {
        isAnyProcessing = true;
      }
    });

    return {
      pending: totalPending,
      syncing: isAnyProcessing,
      networkSpeed: this.networkSpeed,
      queueSizes: {
        critical: this.queues.get(SyncTier.CRITICAL)?.length || 0,
        high: this.queues.get(SyncTier.HIGH)?.length || 0,
        normal: this.queues.get(SyncTier.NORMAL)?.length || 0,
        low: this.queues.get(SyncTier.LOW)?.length || 0
      }
    };
  }

  subscribe(callback: (status: SyncStatus) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    const status = this.getStatus();
    this.listeners.forEach(callback => callback(status));
  }

  getTierForCollection(collection: string): SyncTier {
    return COLLECTION_TIERS[collection] ?? SyncTier.NORMAL;
  }

  private async clearPendingSync(collection: string, data: any): Promise<void> {
    if (!data?.id || !data?.syncMetadata) return;
    
    const updatedData = {
      ...data,
      syncMetadata: {
        ...data.syncMetadata,
        pendingSync: false,
        lastSyncedAt: new Date()
      }
    };

    try {
      switch (collection) {
        case 'transactions':
          await saveTransaction(updatedData as Transaction);
          break;
        case 'budgets':
          await saveBudget(updatedData as Budget);
          break;
        case 'goals':
          await saveGoal(updatedData as Goal);
          break;
        case 'trips':
          await saveTrip(updatedData as Trip);
          break;
        case 'trip_expenses':
          await saveTripExpense(updatedData as TripExpense);
          break;
        default:
          logger.debug(`No clearPendingSync handler for collection: ${collection}`);
      }
    } catch (error) {
      logger.error(`Failed to clear pendingSync for ${collection}:${data.id}`, error);
    }
  }
}

export interface SyncStatus {
  pending: number;
  syncing: boolean;
  networkSpeed: string;
  queueSizes: {
    critical: number;
    high: number;
    normal: number;
    low: number;
  };
}

class RateLimiter {
  private operations: number[] = [];
  private maxOperations: number;
  private windowMs: number;

  constructor(maxOperations: number, windowMs: number) {
    this.maxOperations = maxOperations;
    this.windowMs = windowMs;
  }

  canProceed(): boolean {
    this.cleanOldOperations();
    return this.operations.length < this.maxOperations;
  }

  tryAcquire(): boolean {
    this.cleanOldOperations();
    if (this.operations.length < this.maxOperations) {
      this.operations.push(Date.now());
      return true;
    }
    return false;
  }

  recordOperation(): void {
    this.operations.push(Date.now());
  }

  private cleanOldOperations(): void {
    const cutoff = Date.now() - this.windowMs;
    this.operations = this.operations.filter(timestamp => timestamp > cutoff);
  }

  getRemainingOperations(): number {
    this.cleanOldOperations();
    return Math.max(0, this.maxOperations - this.operations.length);
  }

  getTimeUntilNextSlot(): number {
    this.cleanOldOperations();
    if (this.operations.length < this.maxOperations) {
      return 0;
    }
    const oldestOp = Math.min(...this.operations);
    return Math.max(0, (oldestOp + this.windowMs) - Date.now());
  }
}

export const tieredSyncEngine = new TieredSyncEngine();
