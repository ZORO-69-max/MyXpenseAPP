import { useState, useEffect, useCallback } from 'react';
import type { Trip, TripExpense } from '../types';
import { hybridDataService } from '../services/hybridDataService';
import { useAuth } from '../context/AuthContext';

export const useTrips = () => {
  const { currentUser } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.uid) {
      hybridDataService.setUser(currentUser.uid);
      loadTrips();

      const viewId = `trips-list-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const unsubscribe = hybridDataService.subscribeToView(
        viewId,
        ['trips'],
        () => loadTrips()
      );

      return () => unsubscribe();
    } else {
      setTrips([]);
      setLoading(false);
    }
  }, [currentUser]);

  const loadTrips = async () => {
    if (!currentUser?.uid) return;
    try {
      const data = await hybridDataService.getTrips();
      setTrips(data);
    } catch (error) {
      console.error('Error loading trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTrip = useCallback(async (trip: Trip) => {
    // Optimistic Update
    const previousTrips = [...trips];
    setTrips(prev => [trip, ...prev]);

    try {
      await hybridDataService.saveTrip(trip);
    } catch (error) {
      console.error('Failed to save trip:', error);
      setTrips(previousTrips);
      throw error;
    }
  }, [trips]);

  const updateTrip = useCallback(async (trip: Trip) => {
    // Optimistic Update
    const previousTrips = [...trips];
    setTrips(prev => prev.map(t => t.id === trip.id ? trip : t));

    try {
      await hybridDataService.saveTrip(trip);
    } catch (error) {
      console.error('Failed to update trip:', error);
      setTrips(previousTrips);
      throw error;
    }
  }, [trips]);

  const removeTrip = useCallback(async (id: string) => {
    // Optimistic Update
    const previousTrips = [...trips];
    setTrips(prev => prev.filter(t => t.id !== id));

    try {
      await hybridDataService.deleteTrip(id);
    } catch (error) {
      console.error('Failed to delete trip:', error);
      setTrips(previousTrips);
      throw error;
    }
  }, [trips]);

  return {
    trips,
    loading,
    addTrip,
    updateTrip,
    removeTrip,
    refreshTrips: loadTrips
  };
};

export const useTripExpenses = (tripId: string) => {
  const [expenses, setExpenses] = useState<TripExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (tripId) {
      loadExpenses();

      const unsubscribe = hybridDataService.subscribeToView(
        `trip-expenses-${tripId}`,
        ['trip_expenses'],
        () => loadExpenses()
      );

      return () => unsubscribe();
    }
  }, [tripId]);

  const loadExpenses = async () => {
    try {
      const data = await hybridDataService.getTripExpenses(tripId);
      setExpenses(data);

      // Always sync from cloud in background to ensure multi-device sync works
      // Don't wait for it to complete before showing local data
      syncFromCloudInBackground();
    } catch (error) {
      console.error('Error loading trip expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncFromCloudInBackground = async () => {
    if (syncing) return;

    try {
      setSyncing(true);
      const cloudExpenses = await hybridDataService.syncTripExpensesFromCloud(tripId);
      if (cloudExpenses.length > 0) {
        setExpenses(cloudExpenses);
      }
    } catch (error) {
      console.error('Error syncing trip expenses from cloud:', error);
    } finally {
      setSyncing(false);
    }
  };

  const refreshFromCloud = useCallback(async () => {
    if (!tripId) return;

    try {
      setSyncing(true);
      const cloudExpenses = await hybridDataService.syncTripExpensesFromCloud(tripId);
      setExpenses(cloudExpenses);
    } catch (error) {
      console.error('Error refreshing trip expenses from cloud:', error);
    } finally {
      setSyncing(false);
    }
  }, [tripId]);

  const addExpense = useCallback(async (expense: TripExpense) => {
    // Optimistic Update
    const previousExpenses = [...expenses];
    setExpenses(prev => [expense, ...prev]);

    try {
      await hybridDataService.saveTripExpense(expense);
    } catch (error) {
      console.error('Failed to save trip expense:', error);
      setExpenses(previousExpenses);
      throw error;
    }
  }, [expenses]);

  const updateExpense = useCallback(async (expense: TripExpense) => {
    // Optimistic Update
    const previousExpenses = [...expenses];
    setExpenses(prev => prev.map(e => e.id === expense.id ? expense : e));

    try {
      await hybridDataService.saveTripExpense(expense);
    } catch (error) {
      console.error('Failed to update trip expense:', error);
      setExpenses(previousExpenses);
      throw error;
    }
  }, [expenses]);

  const removeExpense = useCallback(async (id: string) => {
    // Optimistic Update
    const previousExpenses = [...expenses];
    setExpenses(prev => prev.filter(e => e.id !== id));

    try {
      await hybridDataService.deleteTripExpense(id);
    } catch (error) {
      console.error('Failed to delete trip expense:', error);
      setExpenses(previousExpenses);
      throw error;
    }
  }, [expenses]);

  return {
    expenses,
    loading,
    syncing,
    addExpense,
    updateExpense,
    removeExpense,
    refreshExpenses: loadExpenses,
    refreshFromCloud
  };
};
