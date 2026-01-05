import { logger } from '../utils/logger';
import { getDB } from '../utils/db';
import { tieredSyncEngine, SyncTier } from './tieredSyncEngine';
import { auditLogger } from './auditLogger';
import type { Transaction, Budget, Goal, Trip, TripExpense } from '../types';

export interface SoftDeletableItem {
  id: string;
  deletedAt?: Date | null;
  deletedBy?: string;
  retentionDays?: number;
  permanentDeleteAt?: Date | null;
}

interface DeletedItemRecord {
  id: string;
  collection: string;
  data: any;
  deletedAt: Date;
  deletedBy: string;
  retentionDays: number;
  permanentDeleteAt: Date;
  restored: boolean;
  restoredAt?: Date;
}

const RETENTION_POLICIES: Record<string, number> = {
  transactions: 30,
  budgets: 30,
  goals: 30,
  trips: 90,
  trip_expenses: 90,
  settlements: -1,
  vault_transactions: -1
};

const DELETED_ITEMS_KEY = 'soft_deleted_items';

class SoftDeleteService {
  private userId: string | null = null;

  setUser(userId: string | null) {
    this.userId = userId;
  }

  private getRetentionDays(collection: string): number {
    return RETENTION_POLICIES[collection] ?? 30;
  }

  private getDeletedItems(): DeletedItemRecord[] {
    try {
      const stored = localStorage.getItem(DELETED_ITEMS_KEY);
      if (stored) {
        const items = JSON.parse(stored);
        return items.map((item: any) => ({
          ...item,
          deletedAt: new Date(item.deletedAt),
          permanentDeleteAt: new Date(item.permanentDeleteAt),
          restoredAt: item.restoredAt ? new Date(item.restoredAt) : undefined
        }));
      }
    } catch (error) {
      logger.error('Failed to get deleted items:', error);
    }
    return [];
  }

  private saveDeletedItems(items: DeletedItemRecord[]): void {
    try {
      localStorage.setItem(DELETED_ITEMS_KEY, JSON.stringify(items));
    } catch (error) {
      logger.error('Failed to save deleted items:', error);
    }
  }

  async softDelete<T extends { id: string }>(
    collection: string,
    item: T
  ): Promise<boolean> {
    if (!this.userId) {
      logger.error('No user set for soft delete');
      return false;
    }

    const retentionDays = this.getRetentionDays(collection);

    if (retentionDays === -1) {
      logger.warn(`Collection ${collection} does not support deletion`);
      return false;
    }

    const deletedAt = new Date();
    const permanentDeleteAt = new Date(deletedAt);
    permanentDeleteAt.setDate(permanentDeleteAt.getDate() + retentionDays);

    const record: DeletedItemRecord = {
      id: item.id,
      collection,
      data: item,
      deletedAt,
      deletedBy: this.userId,
      retentionDays,
      permanentDeleteAt,
      restored: false
    };

    const items = this.getDeletedItems();
    const existingIndex = items.findIndex(
      i => i.id === item.id && i.collection === collection
    );

    if (existingIndex >= 0) {
      items[existingIndex] = record;
    } else {
      items.push(record);
    }

    this.saveDeletedItems(items);

    await auditLogger.log('delete', collection as any, item.id, {
      previousValue: item
    });

    await tieredSyncEngine.enqueue('deleted_items', 'save', record, SyncTier.LOW);

    logger.debug(`Soft deleted ${collection}:${item.id}, will be permanently deleted on ${permanentDeleteAt}`);
    return true;
  }

  async restore(collection: string, itemId: string): Promise<any | null> {
    if (!this.userId) {
      return null;
    }

    const items = this.getDeletedItems();
    const recordIndex = items.findIndex(
      i => i.id === itemId && i.collection === collection && !i.restored
    );

    if (recordIndex === -1) {
      logger.warn(`No deleted item found: ${collection}:${itemId}`);
      return null;
    }

    const record = items[recordIndex];

    if (new Date() > record.permanentDeleteAt) {
      logger.warn(`Item ${collection}:${itemId} has been permanently deleted`);
      return null;
    }

    record.restored = true;
    record.restoredAt = new Date();
    this.saveDeletedItems(items);

    const db = await getDB();

    switch (collection) {
      case 'transactions':
        await db.put('transactions', record.data as Transaction);
        break;
      case 'budgets':
        await db.put('budgets', record.data as Budget);
        break;
      case 'goals':
        await db.put('goals', record.data as Goal);
        break;
      case 'trips':
        await db.put('trips', record.data as Trip);
        break;
      case 'trip_expenses':
        await db.put('trip_expenses', record.data as TripExpense);
        break;
    }

    await auditLogger.log('restore', collection as any, itemId, {
      newValue: record.data
    });

    await tieredSyncEngine.enqueue(collection, 'save', record.data, SyncTier.HIGH);

    logger.debug(`Restored ${collection}:${itemId}`);
    return record.data;
  }

  getDeletedItemsByCollection(collection: string): DeletedItemRecord[] {
    if (!this.userId) return [];

    return this.getDeletedItems().filter(
      item => item.collection === collection &&
        item.deletedBy === this.userId &&
        !item.restored &&
        new Date() <= item.permanentDeleteAt
    );
  }

  getAllDeletedItems(): DeletedItemRecord[] {
    if (!this.userId) return [];

    return this.getDeletedItems().filter(
      item => item.deletedBy === this.userId &&
        !item.restored &&
        new Date() <= item.permanentDeleteAt
    );
  }

  async runCleanup(): Promise<number> {
    const items = this.getDeletedItems();
    const now = new Date();
    let deletedCount = 0;

    const remainingItems = items.filter(item => {
      if (item.restored) {
        return false;
      }

      if (now > item.permanentDeleteAt) {
        logger.debug(`Permanently deleting ${item.collection}:${item.id}`);
        deletedCount++;
        return false;
      }

      return true;
    });

    if (deletedCount > 0) {
      this.saveDeletedItems(remainingItems);
      logger.info(`Cleanup: Permanently deleted ${deletedCount} items`);
    }

    return deletedCount;
  }

  scheduleCleanup(): () => void {
    const intervalId = setInterval(() => {
      this.runCleanup();
    }, 24 * 60 * 60 * 1000);

    this.runCleanup();

    return () => clearInterval(intervalId);
  }

  getItemRetentionInfo(collection: string, itemId: string): {
    isDeleted: boolean;
    deletedAt?: Date;
    permanentDeleteAt?: Date;
    daysRemaining?: number;
    canRestore: boolean;
  } | null {
    const items = this.getDeletedItems();
    const record = items.find(
      i => i.id === itemId && i.collection === collection && !i.restored
    );

    if (!record) {
      return { isDeleted: false, canRestore: false };
    }

    const now = new Date();
    const canRestore = now <= record.permanentDeleteAt;
    const daysRemaining = canRestore
      ? Math.ceil((record.permanentDeleteAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      : 0;

    return {
      isDeleted: true,
      deletedAt: record.deletedAt,
      permanentDeleteAt: record.permanentDeleteAt,
      daysRemaining,
      canRestore
    };
  }

  async clearAllDeletedItems(): Promise<void> {
    if (!this.userId) return;

    const items = this.getDeletedItems();
    const remaining = items.filter(item => item.deletedBy !== this.userId);
    this.saveDeletedItems(remaining);

    logger.debug('Cleared all deleted items for current user');
  }

  /**
   * Merge cloud tombstones into local storage for cross-device delete awareness.
   * This ensures items deleted on other devices are not restored during sync.
   */
  mergeCloudTombstones(cloudTombstones: DeletedItemRecord[]): void {
    if (!this.userId) return;

    const localItems = this.getDeletedItems();
    const localMap = new Map(localItems.map(item => [`${item.collection}:${item.id}`, item]));

    let addedCount = 0;
    for (const cloudRecord of cloudTombstones) {
      // Only merge tombstones belonging to this user
      if (cloudRecord.deletedBy !== this.userId) continue;

      const key = `${cloudRecord.collection}:${cloudRecord.id}`;
      const localRecord = localMap.get(key);

      // Add if not exists locally, or update if cloud has newer deletion
      if (!localRecord || new Date(cloudRecord.deletedAt) > new Date(localRecord.deletedAt)) {
        localMap.set(key, {
          ...cloudRecord,
          deletedAt: new Date(cloudRecord.deletedAt),
          permanentDeleteAt: new Date(cloudRecord.permanentDeleteAt),
          restoredAt: cloudRecord.restoredAt ? new Date(cloudRecord.restoredAt) : undefined
        });
        addedCount++;
      }
    }

    if (addedCount > 0) {
      this.saveDeletedItems(Array.from(localMap.values()));
      logger.debug(`Merged ${addedCount} tombstones from cloud`);
    }
  }

  /**
   * Check if an item is marked as deleted (for sync checks)
   */
  isItemDeleted(collection: string, itemId: string): boolean {
    if (!this.userId) return false;

    const items = this.getDeletedItems();
    return items.some(
      item => item.id === itemId &&
        item.collection === collection &&
        item.deletedBy === this.userId &&
        !item.restored &&
        new Date() <= item.permanentDeleteAt
    );
  }
}

export const softDeleteService = new SoftDeleteService();
