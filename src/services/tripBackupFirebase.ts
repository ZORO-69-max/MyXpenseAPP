import { logger } from '../utils/logger';
import { isFirebaseConfigured } from '../config/firebase';
import type { Trip, TripExpense } from '../types';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';

export interface TripBackupRecord {
  userId: string;
  tripId: string;
  tripName: string;
  backupDate: string;
  data: {
    trip: Trip;
    expenses: TripExpense[];
  };
  summary: {
    totalExpenses: number;
    expenseCount: number;
    participantCount: number;
  };
}

class TripBackupFirebaseService {
  async backupTripToFirebase(
    userId: string,
    trip: Trip,
    expenses: TripExpense[]
  ): Promise<void> {
    if (!isFirebaseConfigured()) {
      logger.warn('Firebase not configured, skipping Firebase backup');
      return;
    }

    try {
      const expenseAmount = expenses
        .filter(e => e.type === 'expense')
        .reduce((sum, e) => sum + e.amount, 0);

      const backupRecord: TripBackupRecord = {
        userId,
        tripId: trip.id,
        tripName: trip.name,
        backupDate: new Date().toISOString(),
        data: {
          trip,
          expenses
        },
        summary: {
          totalExpenses: expenseAmount,
          expenseCount: expenses.filter(e => e.type === 'expense').length,
          participantCount: trip.participants.length
        }
      };

      const db = getFirestore();
      const backupsCollection = collection(db, 'trip_backups');
      await addDoc(backupsCollection, backupRecord);
      
      logger.info(`✅ Trip backup created for ${trip.name}`, {
        tripId: trip.id,
        expenseCount: backupRecord.summary.expenseCount
      });
    } catch (error) {
      logger.error('Failed to backup trip to Firebase', {
        error,
        tripId: trip.id
      });
      throw error;
    }
  }

  async backupAllUserTripsToFirebase(
    userId: string,
    trips: Trip[],
    expensesByTripId: Record<string, TripExpense[]>
  ): Promise<void> {
    if (!isFirebaseConfigured()) {
      logger.warn('Firebase not configured, skipping Firebase backup');
      return;
    }

    try {
      const backupData = {
        userId,
        backupDate: new Date().toISOString(),
        tripCount: trips.length,
        tripSummaries: trips.map(trip => ({
          tripId: trip.id,
          tripName: trip.name,
          participantCount: trip.participants.length,
          expenseCount: (expensesByTripId[trip.id] || []).filter(e => e.type === 'expense').length
        })),
        data: trips.map(trip => ({
          trip,
          expenses: expensesByTripId[trip.id] || []
        }))
      };

      const db = getFirestore();
      const backupsCollection = collection(db, 'user_trip_backups');
      await addDoc(backupsCollection, backupData);
      
      logger.info(`✅ Full backup created for ${trips.length} trips`, {
        userId
      });
    } catch (error) {
      logger.error('Failed to backup all trips to Firebase', { error, userId });
      throw error;
    }
  }

  async getBackupHistory(userId: string): Promise<TripBackupRecord[]> {
    if (!isFirebaseConfigured()) {
      return [];
    }

    try {
      const db = getFirestore();
      const backupsCollection = collection(db, 'trip_backups');
      const q = query(backupsCollection, where('userId', '==', userId));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        ...doc.data() as TripBackupRecord
      })).sort((a, b) => 
        new Date(b.backupDate).getTime() - new Date(a.backupDate).getTime()
      );
    } catch (error) {
      logger.error('Failed to retrieve backup history', { error, userId });
      return [];
    }
  }
}

export const tripBackupFirebaseService = new TripBackupFirebaseService();
