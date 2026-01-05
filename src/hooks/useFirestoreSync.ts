import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { hybridDataService } from '../services/hybridDataService';
import type { Transaction, Budget, Goal } from '../types';

export const useFirestoreSync = () => {
  const { currentUser } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (currentUser?.uid) {
      hybridDataService.setUser(currentUser.uid);
    } else {
      hybridDataService.setUser(null);
    }
  }, [currentUser?.uid]);

  const syncLocalToFirestore = useCallback(async () => {
    setIsSyncing(true);
    try {
      await hybridDataService.forceSync();
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return {
    isOnline,
    isSyncing,
    syncLocalToFirestore
  };
};

export const useTransactions = () => {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  const loadTransactions = useCallback(async () => {
    if (!currentUser) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    try {
      const data = await hybridDataService.getTransactions();
      setTransactions(data.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
      loadedRef.current = true;
    } catch (err) {
      console.error('Error loading transactions:', err);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    hybridDataService.setUser(currentUser.uid);
    // Initial load from IDB
    loadTransactions();

    // Subscribe to real-time updates (Recent 50 for efficiency)
    const unsubscribe = hybridDataService.subscribeToView(
      'transactions-list',
      ['transactions'],
      () => {
        // When cloud update comes, merge/replace local state
        // Sort specifically for transactions
        setTransactions(prev => {
          // Merge logic if needed, or replace if we trust the limited view
          // For 'transactions-list', we receive the view data.
          // However, we might want to keep older items loaded from IDB?
          // Strategy: Re-load from IDB + Cloud Data, or just trust IDB (since Listener persists to IDB)
          // Actually, SmartListener persists to IDB. So we can just re-load from IDB?
          // OR use the data passed here which is from Cloud.

          // Better Strategy for UX:
          // The Listener updates IDB. We can re-fetch from IDB to get full list (incl history).
          loadTransactions();
          return prev; // loadTransactions will update state
        });
      },
      { limit: 50 }
    );

    return () => {
      unsubscribe();
    };
  }, [currentUser, loadTransactions]);

  const addTransaction = useCallback(async (transaction: Transaction) => {
    if (!currentUser) {
      throw new Error('You must be signed in to add transactions');
    }

    const transactionWithUserId = { ...transaction, userId: currentUser.uid };

    // Optimistic Update
    const previousTransactions = [...transactions];
    setTransactions(prev => [transactionWithUserId, ...prev].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));

    try {
      await hybridDataService.saveTransaction(transactionWithUserId);
    } catch (error) {
      console.error('Failed to save transaction:', error);
      setTransactions(previousTransactions);
      throw error;
    }
  }, [currentUser, transactions]);

  const removeTransaction = useCallback(async (id: string) => {
    if (!currentUser) return;

    // Optimistic Update
    const previousTransactions = [...transactions];
    setTransactions(prev => prev.filter(t => t.id !== id));

    try {
      await hybridDataService.deleteTransaction(id);
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      setTransactions(previousTransactions);
      throw error;
    }
  }, [currentUser, transactions]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    if (!currentUser) return;

    const existing = transactions.find(t => t.id === id);
    if (!existing) return;

    const normalizedUpdates = { ...updates };
    if (updates.date && typeof updates.date === 'string') {
      normalizedUpdates.date = new Date(updates.date);
    }

    const updated: Transaction = {
      ...existing,
      ...normalizedUpdates,
      updatedAt: new Date()
    };

    // Optimistic Update
    const previousTransactions = [...transactions];
    setTransactions(prev =>
      prev.map(t => t.id === id ? updated : t)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    );

    try {
      await hybridDataService.saveTransaction(updated);
    } catch (error) {
      console.error('Failed to update transaction:', error);
      setTransactions(previousTransactions);
      throw error;
    }
  }, [currentUser, transactions]);

  const refreshTransactions = useCallback(async () => {
    await loadTransactions();
  }, [loadTransactions]);

  return {
    transactions,
    loading,
    addTransaction,
    removeTransaction,
    updateTransaction,
    refreshTransactions
  };
};

export const useBudgets = () => {
  const { currentUser } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBudgets = useCallback(async () => {
    if (!currentUser) {
      setBudgets([]);
      setLoading(false);
      return;
    }

    try {
      const data = await hybridDataService.getBudgets();
      setBudgets(data);
    } catch (err) {
      console.error('Error loading budgets:', err);
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setBudgets([]);
      setLoading(false);
      return;
    }

    hybridDataService.setUser(currentUser.uid);
    loadBudgets();

    const unsubscribe = hybridDataService.subscribeToView(
      'budgets-list',
      ['budgets'],
      () => loadBudgets() // Reload from IDB when cloud updates
    );

    return () => unsubscribe();
  }, [currentUser, loadBudgets]);

  const addBudget = useCallback(async (budget: Budget) => {
    if (!currentUser) return;

    const budgetWithUserId = { ...budget, userId: currentUser.uid };

    // Optimistic Update
    const previousBudgets = [...budgets];
    setBudgets(prev => [...prev, budgetWithUserId]);

    try {
      await hybridDataService.saveBudget(budgetWithUserId);
    } catch (error) {
      console.error('Failed to save budget:', error);
      setBudgets(previousBudgets);
      throw error;
    }
  }, [currentUser, budgets]);

  const removeBudget = useCallback(async (id: string) => {
    if (!currentUser) return;

    // Optimistic Update
    const previousBudgets = [...budgets];
    setBudgets(prev => prev.filter(b => b.id !== id));

    try {
      await hybridDataService.deleteBudget(id);
    } catch (error) {
      console.error('Failed to delete budget:', error);
      setBudgets(previousBudgets);
      throw error;
    }
  }, [currentUser, budgets]);

  const updateBudget = useCallback(async (budget: Budget) => {
    if (!currentUser) return;

    const budgetWithUserId = { ...budget, userId: currentUser.uid };

    // Optimistic Update
    const previousBudgets = [...budgets];
    setBudgets(prev => prev.map(b => b.id === budgetWithUserId.id ? budgetWithUserId : b));

    try {
      await hybridDataService.saveBudget(budgetWithUserId);
    } catch (error) {
      console.error('Failed to update budget:', error);
      setBudgets(previousBudgets);
      throw error;
    }
  }, [currentUser, budgets]);

  const refreshBudgets = useCallback(async () => {
    await loadBudgets();
  }, [loadBudgets]);

  return {
    budgets,
    loading,
    addBudget,
    removeBudget,
    updateBudget,
    refreshBudgets
  };
};

export const useGoals = () => {
  const { currentUser } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGoals = useCallback(async () => {
    if (!currentUser) {
      setGoals([]);
      setLoading(false);
      return;
    }

    try {
      const data = await hybridDataService.getGoals();
      setGoals(data);
    } catch (err) {
      console.error('Error loading goals:', err);
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setGoals([]);
      setLoading(false);
      return;
    }

    hybridDataService.setUser(currentUser.uid);
    loadGoals();

    const unsubscribe = hybridDataService.subscribeToView(
      'goals-list',
      ['goals'],
      () => loadGoals()
    );

    return () => unsubscribe();
  }, [currentUser, loadGoals]);

  const addGoal = useCallback(async (goal: Goal) => {
    if (!currentUser) return;

    const goalWithUserId = { ...goal, userId: currentUser.uid };

    // Optimistic Update
    const previousGoals = [...goals];
    setGoals(prev => [...prev, goalWithUserId]);

    try {
      await hybridDataService.saveGoal(goalWithUserId);
    } catch (error) {
      console.error('Failed to save goal:', error);
      setGoals(previousGoals);
      throw error;
    }
  }, [currentUser, goals]);

  const updateGoal = useCallback(async (goal: Goal) => {
    if (!currentUser) return;

    const goalWithUserId = { ...goal, userId: currentUser.uid };

    // Optimistic Update
    const previousGoals = [...goals];
    setGoals(prev => prev.map(g => g.id === goalWithUserId.id ? goalWithUserId : g));

    try {
      await hybridDataService.saveGoal(goalWithUserId);
    } catch (error) {
      console.error('Failed to update goal:', error);
      setGoals(previousGoals);
      throw error;
    }
  }, [currentUser, goals]);

  const removeGoal = useCallback(async (id: string) => {
    if (!currentUser) return;

    // Optimistic Update
    const previousGoals = [...goals];
    setGoals(prev => prev.filter(g => g.id !== id));

    try {
      await hybridDataService.deleteGoal(id);
    } catch (error) {
      console.error('Failed to delete goal:', error);
      setGoals(previousGoals);
      throw error;
    }
  }, [currentUser, goals]);

  const refreshGoals = useCallback(async () => {
    await loadGoals();
  }, [loadGoals]);

  return {
    goals,
    loading,
    addGoal,
    updateGoal,
    removeGoal,
    refreshGoals
  };
};
