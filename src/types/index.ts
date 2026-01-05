export interface User {
  uid: string;
  name: string;
  email?: string;
  photoURL?: string;
  createdAt: Date;
  transactions?: Transaction[];
  budgets?: Budget[];
  goals?: Goal[];
}

export interface SyncMetadata {
  lastSyncedAt: Date | null;
  syncVersion: number;
  tier: number;
  pendingSync: boolean;
  deletedAt?: Date | null;
  isDeleted?: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'income' | 'expense' | 'debt' | 'transfer';
  amount: number;
  category: string;
  description: string;
  date: Date | any; // allow for Firestore timestamp
  createdAt: Date | any;
  paymentMethod?: string; // For transfer, this is "From" account
  receiptUrl?: string;

  // Transfer specific fields
  transferFrom?: string; // e.g., 'cash', 'upi', 'card'
  transferTo?: string;   // e.g., 'cash', 'upi', 'card'

  // Trip specific fields
  tripId?: string;
  paidBy?: string;
  splitBetween?: string[];

  // Debt/Borrow specific fields
  borrowerName?: string; // For lending (I gave money to X)
  lenderName?: string;   // For borrowing (I took money from Y)
  debtType?: 'lent' | 'borrowed' | 'settlement_in' | 'settlement_out';
  debtStatus?: 'pending' | 'settled' | 'paid';
  settledAmount?: number; // Track partial settlements (original amount stays unchanged)
  relatedDebtId?: string; // Link to original debt
  expectedDate?: Date;
  updatedAt: Date;
  syncMetadata?: SyncMetadata;
  isTripSettlement?: boolean;
}

export interface Budget {
  id: string;
  userId: string;
  category: string;
  amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt?: Date;
  syncMetadata?: SyncMetadata;
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date;
  theme: number;
  createdAt: Date;
  updatedAt: Date;
  syncMetadata?: SyncMetadata;
}

export type Category =
  | 'food'
  | 'transport'
  | 'shopping'
  | 'bills'
  | 'entertainment'
  | 'health'
  | 'education'
  | 'other';

export type IncomeSource =
  | 'salary'
  | 'freelance'
  | 'investment'
  | 'pocket-money'
  | 'relatives'
  | 'parents-friends'
  | 'scholarship'
  | 'part-time'
  | 'other';

export type PaymentMethod =
  | 'cash'
  | 'upi'
  | 'card'
  | 'debit'
  | 'digital'
  | 'secret_vault';

export interface Trip {
  id: string;
  userId: string;
  name: string;
  icon: string;
  participants: TripParticipant[];
  archived?: boolean;
  ended?: boolean;
  endedAt?: Date;
  settlementTransactionId?: string;
  createdAt: Date;
  updatedAt: Date;
  syncMetadata?: SyncMetadata;
}

export interface TripParticipant {
  id: string;
  name: string;
  isCurrentUser: boolean;
}

export interface TripExpense {
  id: string;
  tripId: string;
  userId: string;
  type: 'expense' | 'income' | 'transfer';
  title: string;
  amount: number;
  category: string;
  icon?: string;
  date: Date;
  paidBy?: string;
  receivedBy?: string;
  from?: string;
  transferredTo?: string;
  split: TripExpenseSplit[];
  createdAt: Date;
  updatedAt: Date;
  syncMetadata?: SyncMetadata;
  paymentMethod?: string;
}

export interface TripExpenseSplit {
  participantId: string;
  amount: number;
}

export interface RecurringRule {
  id: string;
  userId: string;
  title: string;
  baseAmount: number;
  category: string;
  activeDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  lastGeneratedDate: string | null; // ISO Date "YYYY-MM-DD"
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  syncMetadata?: SyncMetadata;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'low_balance' | 'budget_alert' | 'daily_reminder' | 'goal_achieved' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  data?: any; // Additional metadata
}
