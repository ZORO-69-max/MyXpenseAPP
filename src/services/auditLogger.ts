import { logger } from '../utils/logger';
import { getFirestoreSync } from './firestoreSync';
import { isFirebaseConfigured } from '../config/firebase';
import { tieredSyncEngine, SyncTier } from './tieredSyncEngine';

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  previousValue?: any;
  newValue?: any;
  metadata: AuditMetadata;
  timestamp: Date;
  syncedAt?: Date;
}

export type AuditAction = 
  | 'create'
  | 'update'
  | 'delete'
  | 'restore'
  | 'vault_deposit'
  | 'vault_withdraw'
  | 'vault_transfer'
  | 'settlement_create'
  | 'settlement_complete'
  | 'budget_exceeded'
  | 'goal_achieved'
  | 'trip_end'
  | 'trip_settle';

export type AuditEntityType = 
  | 'transaction'
  | 'budget'
  | 'goal'
  | 'trip'
  | 'trip_expense'
  | 'settlement'
  | 'vault'
  | 'vault_transaction';

interface AuditMetadata {
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  appVersion?: string;
  platform?: string;
}

interface StoredAuditLog {
  logs: AuditLogEntry[];
  lastCleanup: number;
}

class AuditLogger {
  private static readonly STORAGE_KEY = 'audit_logs';
  private static readonly MAX_LOCAL_LOGS = 1000;
  private static readonly RETENTION_DAYS = 365;
  private userId: string | null = null;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  setUser(userId: string | null) {
    this.userId = userId;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getMetadata(): AuditMetadata {
    return {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      platform: typeof navigator !== 'undefined' ? navigator.platform : undefined,
      sessionId: this.sessionId,
      appVersion: '1.0.0'
    };
  }

  async log(
    action: AuditAction,
    entityType: AuditEntityType,
    entityId: string,
    options?: {
      previousValue?: any;
      newValue?: any;
      customMetadata?: Partial<AuditMetadata>;
    }
  ): Promise<AuditLogEntry | null> {
    if (!this.userId) {
      logger.debug('No user set, skipping audit log');
      return null;
    }

    const entry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: this.userId,
      action,
      entityType,
      entityId,
      previousValue: options?.previousValue ? this.sanitizeForLog(options.previousValue) : undefined,
      newValue: options?.newValue ? this.sanitizeForLog(options.newValue) : undefined,
      metadata: {
        ...this.getMetadata(),
        ...options?.customMetadata
      },
      timestamp: new Date()
    };

    this.storeLocally(entry);

    if (isFirebaseConfigured()) {
      await tieredSyncEngine.enqueue('audit_logs', 'save', entry, SyncTier.LOW);
    }

    logger.debug(`Audit: ${action} on ${entityType}:${entityId}`);
    return entry;
  }

  private sanitizeForLog(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'object') {
      const sanitized: Record<string, any> = {};
      const sensitiveKeys = ['pin', 'password', 'secret', 'token', 'key', 'hash'];

      for (const [key, val] of Object.entries(value)) {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof val === 'object' && val !== null) {
          sanitized[key] = this.sanitizeForLog(val);
        } else {
          sanitized[key] = val;
        }
      }

      return sanitized;
    }

    return value;
  }

  private storeLocally(entry: AuditLogEntry): void {
    try {
      const stored = this.getStoredLogs();
      stored.logs.unshift(entry);

      if (stored.logs.length > AuditLogger.MAX_LOCAL_LOGS) {
        stored.logs = stored.logs.slice(0, AuditLogger.MAX_LOCAL_LOGS);
      }

      const now = Date.now();
      if (now - stored.lastCleanup > 24 * 60 * 60 * 1000) {
        this.cleanupOldLogs(stored);
        stored.lastCleanup = now;
      }

      localStorage.setItem(AuditLogger.STORAGE_KEY, JSON.stringify(stored));
    } catch (error) {
      logger.error('Failed to store audit log locally:', error);
    }
  }

  private getStoredLogs(): StoredAuditLog {
    try {
      const stored = localStorage.getItem(AuditLogger.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          logs: (parsed.logs || []).map((log: any) => ({
            ...log,
            timestamp: new Date(log.timestamp)
          })),
          lastCleanup: parsed.lastCleanup || 0
        };
      }
    } catch (error) {
      logger.error('Failed to read audit logs:', error);
    }
    return { logs: [], lastCleanup: 0 };
  }

  private cleanupOldLogs(stored: StoredAuditLog): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - AuditLogger.RETENTION_DAYS);

    stored.logs = stored.logs.filter(log => log.timestamp >= cutoffDate);
  }

  async logTransaction(
    action: 'create' | 'update' | 'delete',
    transactionId: string,
    options?: { previousValue?: any; newValue?: any }
  ): Promise<AuditLogEntry | null> {
    return this.log(action, 'transaction', transactionId, options);
  }

  async logVaultOperation(
    action: 'vault_deposit' | 'vault_withdraw' | 'vault_transfer',
    transactionId: string,
    amount: number,
    options?: { previousBalance?: number; newBalance?: number }
  ): Promise<AuditLogEntry | null> {
    return this.log(action, 'vault_transaction', transactionId, {
      previousValue: options?.previousBalance,
      newValue: { amount, newBalance: options?.newBalance }
    });
  }

  async logSettlement(
    action: 'settlement_create' | 'settlement_complete',
    settlementId: string,
    tripId: string,
    participants: string[],
    amounts?: Record<string, number>
  ): Promise<AuditLogEntry | null> {
    return this.log(action, 'settlement', settlementId, {
      newValue: { tripId, participants, amounts }
    });
  }

  async logBudgetAlert(
    budgetId: string,
    category: string,
    currentSpent: number,
    budgetLimit: number
  ): Promise<AuditLogEntry | null> {
    return this.log('budget_exceeded', 'budget', budgetId, {
      newValue: { category, currentSpent, budgetLimit, percentUsed: (currentSpent / budgetLimit) * 100 }
    });
  }

  async logGoalAchieved(
    goalId: string,
    goalName: string,
    targetAmount: number
  ): Promise<AuditLogEntry | null> {
    return this.log('goal_achieved', 'goal', goalId, {
      newValue: { goalName, targetAmount, achievedAt: new Date() }
    });
  }

  async logTripEnd(
    tripId: string,
    tripName: string,
    totalExpenses: number,
    participants: string[]
  ): Promise<AuditLogEntry | null> {
    return this.log('trip_end', 'trip', tripId, {
      newValue: { tripName, totalExpenses, participants, endedAt: new Date() }
    });
  }

  getRecentLogs(limit: number = 50): AuditLogEntry[] {
    const stored = this.getStoredLogs();
    return stored.logs
      .filter(log => log.userId === this.userId)
      .slice(0, limit);
  }

  getLogsByEntity(entityType: AuditEntityType, entityId: string): AuditLogEntry[] {
    const stored = this.getStoredLogs();
    return stored.logs.filter(
      log => log.entityType === entityType && log.entityId === entityId
    );
  }

  getLogsByAction(action: AuditAction, limit: number = 50): AuditLogEntry[] {
    const stored = this.getStoredLogs();
    return stored.logs
      .filter(log => log.action === action && log.userId === this.userId)
      .slice(0, limit);
  }

  async syncLogsToFirebase(): Promise<number> {
    if (!isFirebaseConfigured() || !this.userId) {
      return 0;
    }

    const stored = this.getStoredLogs();
    const unsyncedLogs = stored.logs.filter(log => !log.syncedAt && log.userId === this.userId);

    if (unsyncedLogs.length === 0) {
      return 0;
    }

    try {
      const firestoreSync = getFirestoreSync(this.userId);
      
      for (const log of unsyncedLogs) {
        await firestoreSync.saveDocument('audit_logs' as any, {
          ...log,
          syncedAt: new Date()
        });
        log.syncedAt = new Date();
      }

      localStorage.setItem(AuditLogger.STORAGE_KEY, JSON.stringify(stored));
      
      logger.debug(`Synced ${unsyncedLogs.length} audit logs to Firebase`);
      return unsyncedLogs.length;
    } catch (error) {
      logger.error('Failed to sync audit logs:', error);
      return 0;
    }
  }

  exportLogs(format: 'json' | 'csv' = 'json'): string {
    const stored = this.getStoredLogs();
    const userLogs = stored.logs.filter(log => log.userId === this.userId);

    if (format === 'json') {
      return JSON.stringify(userLogs, null, 2);
    }

    const headers = ['timestamp', 'action', 'entityType', 'entityId', 'sessionId'];
    const rows = userLogs.map(log => [
      log.timestamp.toISOString(),
      log.action,
      log.entityType,
      log.entityId,
      log.metadata.sessionId || ''
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}

export const auditLogger = new AuditLogger();
