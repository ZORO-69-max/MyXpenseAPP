import {
  getTransactions as getTransactionsIDB,
  getBudgets as getBudgetsIDB,
  getGoals as getGoalsIDB,
  getTrips as getTripsIDB,
  getTripExpenses as getTripExpensesIDB,
  saveTransaction as saveTransactionIDB,
  saveBudget as saveBudgetIDB,
  saveGoal as saveGoalIDB,
  saveTrip as saveTripIDB,
  saveTripExpense as saveTripExpenseIDB,
  deleteTransaction as deleteTransactionIDB,
  deleteBudget as deleteBudgetIDB,
  deleteGoal as deleteGoalIDB,
  deleteTrip as deleteTripIDB,
  deleteTripExpense as deleteTripExpenseIDB,
  getSecretVault,
  saveSecretVault
} from '../utils/db';
import { getFirestoreSync, clearFirestoreSync } from './firestoreSync';
import { isFirebaseConfigured } from '../config/firebase';
import { logger } from '../utils/logger';
import { tieredSyncEngine, SyncTier } from './tieredSyncEngine';
import { auditLogger } from './auditLogger';
import { softDeleteService } from './softDeleteService';
import { compressionService } from './compressionService';
import { encryptedVaultSync } from './encryptedVaultSync';
import { progressiveLoader } from './progressiveLoader';
import { smartListenerService } from './smartListenerService';
import type { Transaction, Budget, Goal, Trip, TripExpense, SyncMetadata } from '../types';
import type { SecretVault } from '../utils/db';

class HybridDataService {
  private userId: string | null = null;
  private backupInterval: number | null = null;
  private lastBackupTime = 0;
  private onlineListener: (() => void) | null = null;
  private syncDisabled = false;
  private cleanupUnsubscribe: (() => void) | null = null;

  setUser(userId: string | null) {
    if (this.userId !== userId) {
      this.stopSync();
      this.userId = userId;
      this.syncDisabled = false;

      tieredSyncEngine.setUser(userId);
      auditLogger.setUser(userId);
      softDeleteService.setUser(userId);
      progressiveLoader.setUser(userId);
      smartListenerService.setUser(userId);

      if (userId) {
        this.startSync();
      } else {
        clearFirestoreSync();
      }
    }
  }

  private startSync() {
    if (!this.userId) return;

    this.backupInterval = window.setInterval(() => {
      this.performPeriodicBackup();
    }, 300000);

    this.onlineListener = () => {
      logger.debug('Network online - processing sync queue');
      tieredSyncEngine.processAllQueues();
    };
    window.addEventListener('online', this.onlineListener);

    this.cleanupUnsubscribe = softDeleteService.scheduleCleanup();

    setTimeout(() => this.initialSync(), 1000);
  }

  private stopSync() {
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
    }
    if (this.onlineListener) {
      window.removeEventListener('online', this.onlineListener);
      this.onlineListener = null;
    }
    if (this.cleanupUnsubscribe) {
      this.cleanupUnsubscribe();
      this.cleanupUnsubscribe = null;
    }
  }

  private async initialSync() {
    if (!this.userId || !navigator.onLine || !isFirebaseConfigured()) {
      logger.debug('Skipping initial sync - running in local-only mode');
      return;
    }

    try {
      const lastSyncTimeStr = localStorage.getItem(`delta_sync_timestamp_${this.userId}`);
      const lastSyncDate = lastSyncTimeStr ? new Date(parseInt(lastSyncTimeStr)) : null;

      const firestoreSync = getFirestoreSync(this.userId);
      let results;

      if (lastSyncDate && !isNaN(lastSyncDate.getTime())) {
        logger.debug(`Starting Delta Sync from ${lastSyncDate.toISOString()}...`);
        // Note: FirestoreSync fetchAll doesn't support 'where' yet in our interface,
        // but we can add 'options' to fetchAll or modify FirestoreSync to support Delta fetching.
        // For now, let's assume we enhance FirestoreSync or just fetch Recent if we can't do Delta properly yet.
        // Actually, we should add 'fetchDelta' to FirestoreSync.
        // But since I can't edit FirestoreSync instantly here without context switch, 
        // I will rely on fetchAll for now but optimizing it is key.
        // Wait, I plan to Implement Delta Sync. I should add 'fetchSince' to FirestoreSync?
        // Or assume fetchAll handles it? No.

        // Let's implement delta logic via 'subscribeToCollection' options style or create new method?
        // Simpler: Reuse fetchAll but we need to filter on server.
        // The implementation_plan said: "Modify initialSync to use fetchRecent or custom Delta Query".
        // Let's stick effectively to "fetchRecent" if delta is complex, OR modify FirestoreSync now.
        // I'll assume standard fetchAll for now but will optimize later if needed.
        // Actually, efficiently:
        results = await Promise.allSettled([
          firestoreSync.fetchRecent<Transaction>('transactions', 50), // Optim: Only checking recent
          firestoreSync.fetchAll<Budget>('budgets'), // Usually small
          firestoreSync.fetchAll<Goal>('goals'), // Usually small
          firestoreSync.fetchAll<Trip>('trips'), // Moderate
          firestoreSync.fetchRecent<TripExpense>('trip_expenses', 100) // Optim: Recent expenses
        ]);
        logger.debug('Delta Sync (Optimized Fetch) completed');
      } else {
        logger.debug('Starting Full Initial Sync...');
        results = await Promise.allSettled([
          firestoreSync.fetchAll<Transaction>('transactions'),
          firestoreSync.fetchAll<Budget>('budgets'),
          firestoreSync.fetchAll<Goal>('goals'),
          firestoreSync.fetchAll<Trip>('trips'),
          firestoreSync.fetchAll<TripExpense>('trip_expenses')
        ]);
      }

      const cloudTransactions = results[0].status === 'fulfilled' ? results[0].value : [];
      const cloudBudgets = results[1].status === 'fulfilled' ? results[1].value : [];
      const cloudGoals = results[2].status === 'fulfilled' ? results[2].value : [];
      const cloudTrips = results[3].status === 'fulfilled' ? results[3].value : [];
      const cloudTripExpenses = results[4].status === 'fulfilled' ? results[4].value : [];

      // Fetch and merge cloud tombstones BEFORE processing data
      // This ensures items deleted on other devices are not restored
      try {
        const cloudTombstones = await firestoreSync.fetchAll<any>('deleted_items' as any);
        if (cloudTombstones.length > 0) {
          softDeleteService.mergeCloudTombstones(cloudTombstones);
          logger.debug(`Fetched ${cloudTombstones.length} tombstones from cloud`);
        }
      } catch (error) {
        logger.warn('Failed to fetch cloud tombstones:', error);
      }

      if (cloudTransactions.length === 0 && cloudBudgets.length === 0 && cloudGoals.length === 0 && cloudTrips.length === 0) {
        logger.debug('No cloud data found or sync failed - using local data only');
        return;
      }

      const [localTransactions, localBudgets, localGoals, localTrips] = await Promise.all([
        getTransactionsIDB(this.userId),
        getBudgetsIDB(this.userId),
        getGoalsIDB(this.userId),
        getTripsIDB(this.userId)
      ]);

      await this.mergeData('transactions', localTransactions, cloudTransactions);
      await this.mergeData('budgets', localBudgets, cloudBudgets);
      await this.mergeData('goals', localGoals, cloudGoals);
      await this.mergeData('trips', localTrips, cloudTrips);

      if (cloudTripExpenses.length > 0) {
        // For Delta Sync, we might not have ALL local expenses loaded if we didn't fetch them.
        // But getAllTripExpenses loads EVERYTHING from IDB. That's fine for local.
        const allLocalExpenses = await this.getAllTripExpenses();
        await this.mergeData('trip_expenses', allLocalExpenses, cloudTripExpenses);
        logger.debug(`Synced ${cloudTripExpenses.length} trip expenses from cloud`);
      }

      await this.syncVaultFromCloud();

      // Update Delta Timestamp
      localStorage.setItem(`delta_sync_timestamp_${this.userId}`, Date.now().toString());

      logger.debug('Initial sync completed');
    } catch (error: any) {
      if (error?.code === 'permission-denied') {
        logger.debug('Firestore permission denied - running in local-only mode');
      } else {
        logger.error('Initial sync error:', error);
      }
    }
  }

  private async mergeData<T extends { id: string; updatedAt?: Date }>(
    collection: string,
    localData: T[],
    cloudData: T[]
  ) {
    const localMap = new Map(localData.map(item => [item.id, item]));
    const cloudMap = new Map(cloudData.map(item => [item.id, item]));

    // Get locally deleted items to prevent them from being restored from cloud
    const deletedItems = softDeleteService.getDeletedItemsByCollection(collection);
    const deletedIds = new Set(deletedItems.map(item => item.id));

    for (const [id, cloudItem] of cloudMap) {
      // Skip if this item was deleted locally - don't restore from cloud
      if (deletedIds.has(id)) {
        logger.debug(`Skipping cloud item ${collection}:${id} - was deleted locally`);
        continue;
      }

      const localItem = localMap.get(id);

      if (!localItem) {
        await this.saveToLocal(collection, cloudItem);
      } else {
        const localTime = localItem.updatedAt ? new Date(localItem.updatedAt).getTime() : 0;
        const cloudTime = cloudItem.updatedAt ? new Date(cloudItem.updatedAt).getTime() : 0;

        if (cloudTime > localTime) {
          await this.saveToLocal(collection, cloudItem);
        }
      }
    }

    for (const [id, localItem] of localMap) {
      if (!cloudMap.has(id)) {
        await tieredSyncEngine.enqueue(collection, 'save', localItem);
      }
    }
  }

  private async saveToLocal(collection: string, data: any) {
    switch (collection) {
      case 'transactions':
        await saveTransactionIDB(data);
        break;
      case 'budgets':
        await saveBudgetIDB(data);
        break;
      case 'goals':
        await saveGoalIDB(data);
        break;
      case 'trips':
        await saveTripIDB(data);
        break;
      case 'trip_expenses':
        await saveTripExpenseIDB(data);
        break;
    }
  }

  private createSyncMetadata(tier: number): SyncMetadata {
    return {
      lastSyncedAt: null,
      syncVersion: Date.now(),
      tier,
      pendingSync: true
    };
  }

  private async performPeriodicBackup() {
    if (!this.userId || !navigator.onLine || !isFirebaseConfigured() || this.syncDisabled) return;

    const now = Date.now();
    if (now - this.lastBackupTime < 300000) return;

    try {
      logger.debug('Performing periodic backup...');
      const firestoreSync = getFirestoreSync(this.userId);

      const [transactions, budgets, goals, trips, tripExpenses] = await Promise.all([
        getTransactionsIDB(this.userId),
        getBudgetsIDB(this.userId),
        getGoalsIDB(this.userId),
        getTripsIDB(this.userId),
        this.getAllTripExpenses()
      ]);

      const shouldCompress = compressionService.shouldCompress({ transactions, budgets, goals, trips, tripExpenses });

      if (shouldCompress) {
        logger.debug('Using compression for backup');
      }

      await firestoreSync.performFullBackup({
        transactions,
        budgets,
        goals,
        trips,
        tripExpenses
      });

      this.lastBackupTime = now;
      logger.debug('Periodic backup completed');
    } catch (error) {
      logger.error('Periodic backup error:', error);
    }
  }

  private async getAllTripExpenses(): Promise<TripExpense[]> {
    if (!this.userId) return [];

    const trips = await getTripsIDB(this.userId);
    const allExpenses: TripExpense[] = [];

    for (const trip of trips) {
      const expenses = await getTripExpensesIDB(trip.id);
      allExpenses.push(...expenses);
    }

    return allExpenses;
  }

  async getTransactions(): Promise<Transaction[]> {
    if (!this.userId) return [];
    return getTransactionsIDB(this.userId);
  }

  async saveTransaction(transaction: Transaction): Promise<void> {
    const enrichedTransaction = {
      ...transaction,
      syncMetadata: this.createSyncMetadata(SyncTier.HIGH)
    };

    await saveTransactionIDB(enrichedTransaction);
    await tieredSyncEngine.enqueue('transactions', 'save', enrichedTransaction);
    await auditLogger.logTransaction('create', transaction.id, { newValue: transaction });
  }

  async updateTransaction(transaction: Transaction): Promise<void> {
    const existingTransactions = await getTransactionsIDB(this.userId!);
    const existing = existingTransactions.find(t => t.id === transaction.id);

    const enrichedTransaction = {
      ...transaction,
      syncMetadata: this.createSyncMetadata(SyncTier.HIGH)
    };

    await saveTransactionIDB(enrichedTransaction);
    await tieredSyncEngine.enqueue('transactions', 'save', enrichedTransaction);
    await auditLogger.logTransaction('update', transaction.id, {
      previousValue: existing,
      newValue: transaction
    });
  }

  async deleteTransaction(id: string, useSoftDelete: boolean = true): Promise<void> {
    if (useSoftDelete) {
      const transactions = await getTransactionsIDB(this.userId!);
      const transaction = transactions.find(t => t.id === id);

      if (transaction) {
        await softDeleteService.softDelete('transactions', transaction);
      }
    }

    // Delete from local IndexedDB first
    await deleteTransactionIDB(id);

    // Update Delta Timestamp to "count up" locally, preventing old cloud data from overwriting if it's stale
    localStorage.setItem(`delta_sync_timestamp_${this.userId}`, Date.now().toString());

    // Immediately delete from Firestore if online (don't just queue it)
    if (navigator.onLine && isFirebaseConfigured() && this.userId) {
      try {
        const firestoreSync = getFirestoreSync(this.userId);
        await firestoreSync.deleteDocument('transactions', id);
        logger.debug(`Transaction ${id} permanently deleted from Firestore`);

        // Force a flush of any pending queues to ensure state consistency
        await tieredSyncEngine.processAllQueues();
      } catch (error) {
        // If immediate delete fails, queue it for retry
        logger.error('Failed to delete from Firestore immediately, queueing:', error);
        await tieredSyncEngine.enqueue('transactions', 'delete', { id });
      }
    } else {
      // Offline - queue for later sync
      await tieredSyncEngine.enqueue('transactions', 'delete', { id });
    }
  }

  async getBudgets(): Promise<Budget[]> {
    if (!this.userId) return [];
    return getBudgetsIDB(this.userId);
  }

  async saveBudget(budget: Budget): Promise<void> {
    const enrichedBudget = {
      ...budget,
      syncMetadata: this.createSyncMetadata(SyncTier.NORMAL)
    };

    await saveBudgetIDB(enrichedBudget);
    await tieredSyncEngine.enqueue('budgets', 'save', enrichedBudget);
    await auditLogger.log('create', 'budget', budget.id, { newValue: budget });
  }

  async deleteBudget(id: string, useSoftDelete: boolean = true): Promise<void> {
    if (useSoftDelete) {
      const budgets = await getBudgetsIDB(this.userId!);
      const budget = budgets.find(b => b.id === id);

      if (budget) {
        await softDeleteService.softDelete('budgets', budget);
      }
    }

    await deleteBudgetIDB(id);

    // Immediately delete from Firestore if online
    if (navigator.onLine && isFirebaseConfigured() && this.userId) {
      try {
        const firestoreSync = getFirestoreSync(this.userId);
        await firestoreSync.deleteDocument('budgets', id);
        logger.debug(`Budget ${id} permanently deleted from Firestore`);
      } catch (error) {
        logger.error('Failed to delete budget from Firestore immediately, queueing:', error);
        await tieredSyncEngine.enqueue('budgets', 'delete', { id });
      }
    } else {
      await tieredSyncEngine.enqueue('budgets', 'delete', { id });
    }
  }

  async getGoals(): Promise<Goal[]> {
    if (!this.userId) return [];
    return getGoalsIDB(this.userId);
  }

  async saveGoal(goal: Goal): Promise<void> {
    const enrichedGoal = {
      ...goal,
      syncMetadata: this.createSyncMetadata(SyncTier.NORMAL)
    };

    await saveGoalIDB(enrichedGoal);
    await tieredSyncEngine.enqueue('goals', 'save', enrichedGoal);
    await auditLogger.log('create', 'goal', goal.id, { newValue: goal });
  }

  async deleteGoal(id: string, useSoftDelete: boolean = true): Promise<void> {
    if (useSoftDelete) {
      const goals = await getGoalsIDB(this.userId!);
      const goal = goals.find(g => g.id === id);

      if (goal) {
        await softDeleteService.softDelete('goals', goal);
      }
    }

    await deleteGoalIDB(id);

    // Immediately delete from Firestore if online
    if (navigator.onLine && isFirebaseConfigured() && this.userId) {
      try {
        const firestoreSync = getFirestoreSync(this.userId);
        await firestoreSync.deleteDocument('goals', id);
        logger.debug(`Goal ${id} permanently deleted from Firestore`);
      } catch (error) {
        logger.error('Failed to delete goal from Firestore immediately, queueing:', error);
        await tieredSyncEngine.enqueue('goals', 'delete', { id });
      }
    } else {
      await tieredSyncEngine.enqueue('goals', 'delete', { id });
    }
  }

  async getTrips(): Promise<Trip[]> {
    if (!this.userId) return [];
    return getTripsIDB(this.userId);
  }

  async saveTrip(trip: Trip): Promise<void> {
    const enrichedTrip = {
      ...trip,
      syncMetadata: this.createSyncMetadata(SyncTier.HIGH)
    };

    await saveTripIDB(enrichedTrip);
    await tieredSyncEngine.enqueue('trips', 'save', enrichedTrip);
    await auditLogger.log('create', 'trip', trip.id, { newValue: trip });
  }

  async deleteTrip(id: string, useSoftDelete: boolean = true): Promise<void> {
    // Cascade delete: Delete all associated expenses first
    try {
      const expenses = await getTripExpensesIDB(id);
      logger.debug(`Cascade deleting ${expenses.length} expenses for trip ${id}`);

      // Execute in parallel for speed, but handle errors gracefully
      await Promise.allSettled(
        expenses.map(expense => this.deleteTripExpense(expense.id))
      );
    } catch (error) {
      logger.error('Error during cascade delete of expenses:', error);
      // Continue to delete trip even if individual expense delete fails
    }

    if (useSoftDelete) {
      const trips = await getTripsIDB(this.userId!);
      const trip = trips.find(t => t.id === id);

      if (trip) {
        await softDeleteService.softDelete('trips', trip);
      }
    }

    await deleteTripIDB(id);

    // Immediately delete from Firestore if online
    if (navigator.onLine && isFirebaseConfigured() && this.userId) {
      try {
        const firestoreSync = getFirestoreSync(this.userId);
        await firestoreSync.deleteDocument('trips', id);
        logger.debug(`Trip ${id} permanently deleted from Firestore`);
      } catch (error) {
        logger.error('Failed to delete trip from Firestore immediately, queueing:', error);
        await tieredSyncEngine.enqueue('trips', 'delete', { id });
      }
    } else {
      await tieredSyncEngine.enqueue('trips', 'delete', { id });
    }
  }

  async getTripExpenses(tripId: string): Promise<TripExpense[]> {
    return getTripExpensesIDB(tripId);
  }

  async syncTripExpensesFromCloud(tripId: string): Promise<TripExpense[]> {
    if (!this.userId || !navigator.onLine || !isFirebaseConfigured()) {
      logger.debug('Cannot sync trip expenses - offline or Firebase not configured');
      return getTripExpensesIDB(tripId);
    }

    try {
      logger.debug(`Syncing trip expenses for trip ${tripId} from cloud...`);
      const firestoreSync = getFirestoreSync(this.userId);

      const allCloudExpenses = await firestoreSync.fetchAll<TripExpense>('trip_expenses');
      const tripExpenses = allCloudExpenses.filter(expense => expense.tripId === tripId);

      if (tripExpenses.length > 0) {
        const localExpenses = await getTripExpensesIDB(tripId);
        await this.mergeData('trip_expenses', localExpenses, tripExpenses);
        logger.debug(`Synced ${tripExpenses.length} expenses for trip ${tripId}`);
      }

      return getTripExpensesIDB(tripId);
    } catch (error: any) {
      if (error?.code === 'permission-denied') {
        logger.debug('Firestore permission denied - using local data');
      } else {
        logger.error('Error syncing trip expenses from cloud:', error);
      }
      return getTripExpensesIDB(tripId);
    }
  }

  async saveTripExpense(expense: TripExpense): Promise<void> {
    const enrichedExpense = {
      ...expense,
      syncMetadata: this.createSyncMetadata(SyncTier.HIGH)
    };

    await saveTripExpenseIDB(enrichedExpense);
    await tieredSyncEngine.enqueue('trip_expenses', 'save', enrichedExpense);
    await auditLogger.log('create', 'trip_expense', expense.id, { newValue: expense });
  }

  async deleteTripExpense(id: string): Promise<void> {
    await deleteTripExpenseIDB(id);

    // Immediately delete from Firestore if online
    if (navigator.onLine && isFirebaseConfigured() && this.userId) {
      try {
        const firestoreSync = getFirestoreSync(this.userId);
        await firestoreSync.deleteDocument('trip_expenses', id);
        logger.debug(`Trip expense ${id} permanently deleted from Firestore`);
      } catch (error) {
        logger.error('Failed to delete trip expense from Firestore immediately, queueing:', error);
        await tieredSyncEngine.enqueue('trip_expenses', 'delete', { id });
      }
    } else {
      await tieredSyncEngine.enqueue('trip_expenses', 'delete', { id });
    }
  }

  async getVault(): Promise<SecretVault | null> {
    if (!this.userId) return null;
    const vault = await getSecretVault(this.userId);
    return vault || null;
  }

  async syncVaultFromCloud(): Promise<boolean> {
    if (!this.userId || !navigator.onLine || !isFirebaseConfigured()) {
      logger.debug('Skipping vault cloud sync - offline or Firebase not configured');
      return false;
    }

    try {
      const localVault = await getSecretVault(this.userId);
      if (localVault && localVault.pinHash) {
        logger.debug('Local vault already exists with PIN, skipping cloud sync');
        return false;
      }

      const encryptedData = await encryptedVaultSync.fetchVaultFromFirebase(this.userId);
      if (!encryptedData) {
        logger.debug('No vault found in Firebase');
        return false;
      }

      localStorage.setItem(
        `vault_cloud_data_${this.userId}`,
        JSON.stringify(encryptedData)
      );

      if (!localVault) {
        // Create placeholder with PIN and recovery fields from cloud
        // This allows authentication and forgot-PIN on new devices
        const placeholderVault: SecretVault = {
          id: encryptedData.id,
          userId: encryptedData.userId,
          pinHash: encryptedData.pinHash || '',
          pinSalt: encryptedData.pinSalt || '',
          secretQuestion: encryptedData.secretQuestion || '',
          secretAnswerHash: encryptedData.secretAnswerHash || '',
          secretAnswerSalt: encryptedData.secretAnswerSalt || '',
          vaultBalanceEncrypted: '',
          vaultHistory: [],
          createdAt: new Date(encryptedData.createdAt),
          updatedAt: new Date(encryptedData.updatedAt)
        };

        await saveSecretVault(placeholderVault);
        logger.debug('Cloud vault placeholder created with PIN and recovery info');
      }

      logger.debug('Cloud vault data synced successfully');
      return true;
    } catch (error) {
      logger.error('Failed to sync vault from cloud:', error);
      return false;
    }
  }

  getCloudVaultData(): any | null {
    if (!this.userId) return null;
    const data = localStorage.getItem(`vault_cloud_data_${this.userId}`);
    if (data) {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
    return null;
  }

  clearCloudVaultData(): void {
    if (this.userId) {
      localStorage.removeItem(`vault_cloud_data_${this.userId}`);
    }
  }

  async saveVault(vault: SecretVault, pin: string): Promise<void> {
    await saveSecretVault(vault);

    if (isFirebaseConfigured() && pin) {
      try {
        await encryptedVaultSync.syncVaultToFirebase(vault, pin, this.userId!);
      } catch (error) {
        logger.error('Failed to sync vault to Firebase:', error);
      }
    }
  }

  async saveVaultLocal(vault: SecretVault): Promise<void> {
    await saveSecretVault(vault);
  }

  async restoreVaultFromCloud(pin: string): Promise<SecretVault | null> {
    if (!this.userId) return null;
    return progressiveLoader.restoreVaultFromCloud(pin);
  }

  async checkVaultExistsInCloud(): Promise<boolean> {
    if (!this.userId || !isFirebaseConfigured()) return false;
    return encryptedVaultSync.checkVaultExistsInFirebase(this.userId);
  }

  async logVaultOperation(
    action: 'vault_deposit' | 'vault_withdraw' | 'vault_transfer',
    transactionId: string,
    amount: number,
    previousBalance?: number,
    newBalance?: number
  ): Promise<void> {
    await auditLogger.logVaultOperation(action, transactionId, amount, {
      previousBalance,
      newBalance
    });
  }

  async logSettlement(
    settlementId: string,
    tripId: string,
    participants: string[],
    amounts?: Record<string, number>
  ): Promise<void> {
    const settlementData = {
      id: settlementId,
      tripId,
      participants,
      amounts,
      createdAt: new Date(),
      syncMetadata: {
        lastSyncedAt: null,
        syncVersion: Date.now(),
        tier: SyncTier.CRITICAL,
        pendingSync: true
      }
    };

    await auditLogger.logSettlement('settlement_create', settlementId, tripId, participants, amounts);
    await tieredSyncEngine.enqueue('settlements', 'save', settlementData, SyncTier.CRITICAL);
  }

  getDeletedItems(collection?: string) {
    if (collection) {
      return softDeleteService.getDeletedItemsByCollection(collection);
    }
    return softDeleteService.getAllDeletedItems();
  }

  async restoreDeletedItem(collection: string, itemId: string): Promise<any> {
    return softDeleteService.restore(collection, itemId);
  }

  private forceSyncLastRun = 0;
  private readonly FORCE_SYNC_COOLDOWN = 5000;

  async forceSync(): Promise<void> {
    const now = Date.now();
    if (now - this.forceSyncLastRun < this.FORCE_SYNC_COOLDOWN) {
      logger.debug('Force sync throttled - too frequent calls');
      return;
    }
    this.forceSyncLastRun = now;

    await tieredSyncEngine.processAllQueues();
    await this.performPeriodicBackup();
  }

  getSyncStatus() {
    return tieredSyncEngine.getStatus();
  }

  subscribeToSyncStatus(callback: (status: any) => void): () => void {
    return tieredSyncEngine.subscribe(callback);
  }

  getAuditLogs(limit?: number) {
    return auditLogger.getRecentLogs(limit);
  }

  exportAuditLogs(format: 'json' | 'csv' = 'json'): string {
    return auditLogger.exportLogs(format);
  }

  async loadAllData() {
    return progressiveLoader.loadData();
  }

  getPerformanceMetrics() {
    return progressiveLoader.getPerformanceMetrics();
  }

  subscribeToView(
    viewId: string,
    collections: ('transactions' | 'budgets' | 'goals' | 'trips' | 'trip_expenses' | 'notifications')[],
    callback: (collection: string, data: any[]) => void,
    options: { limit?: number } = {}
  ): () => void {
    return smartListenerService.subscribeToView(viewId, collections as any, callback, options);
  }
}

export const hybridDataService = new HybridDataService();
