import type { Trip, TripParticipant, TripExpense, TripExpenseSplit } from '../types';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface BalanceDetails {
  participantId: string;
  participant: TripParticipant;
  totalPaid: number;      // What they paid out of pocket
  totalConsumed: number;  // What they actually consumed (their share)
  netBalance: number;     // totalPaid - totalConsumed (positive = gets back, negative = owes)
}

export interface Settlement {
  from: TripParticipant;
  to: TripParticipant;
  amount: number;
  contributingExpenses: { title: string; amount: number }[];
}

export interface SplitState {
  lockedUsers: Set<string>;
  manualAmounts: Map<string, number>;
}

// ============================================
// SMART SPLIT ALGORITHM
// ============================================

/**
 * Calculate smart split with auto-balancing
 * When user types a fixed amount for one person, remaining amount redistributes among others
 */
export function calculateSmartSplit(
  totalAmount: number,
  participants: TripParticipant[],
  splitState: SplitState
): TripExpenseSplit[] {
  const { lockedUsers, manualAmounts } = splitState;

  // Step 1: Sum all locked/manual amounts
  let lockedTotal = 0;
  manualAmounts.forEach((amount) => {
    lockedTotal += amount;
  });

  // Step 2: Calculate remainder for unlocked participants
  const remainingAmount = totalAmount - lockedTotal;
  const unlockedParticipants = participants.filter(p => !lockedUsers.has(p.id));

  // Step 3: Validate - prevent overspending
  if (remainingAmount < 0) {
    throw new Error(`Split exceeds total by ₹${Math.abs(remainingAmount).toFixed(2)}`);
  }

  // Step 4: Calculate auto-share for unlocked users
  const autoShare = unlockedParticipants.length > 0
    ? remainingAmount / unlockedParticipants.length
    : 0;

  // Step 5: Build final split array
  return participants.map(p => ({
    participantId: p.id,
    amount: lockedUsers.has(p.id)
      ? (manualAmounts.get(p.id) || 0)
      : parseFloat(autoShare.toFixed(2))
  }));
}

/**
 * Validate if split amounts sum to total
 */
export function validateSplit(
  totalAmount: number,
  splits: TripExpenseSplit[]
): { valid: boolean; difference: number } {
  const splitSum = splits.reduce((sum, s) => sum + s.amount, 0);
  const difference = Math.abs(totalAmount - splitSum);
  return {
    valid: difference < 0.01, // Allow small floating point errors
    difference: parseFloat(difference.toFixed(2))
  };
}

// ============================================
// BALANCE CALCULATION (PHASE 1)
// ============================================

/**
 * Calculate raw balances from expenses (before applying transfers)
 */
export function calculateRawBalances(
  participants: TripParticipant[],
  expenses: TripExpense[]
): Map<string, BalanceDetails> {
  const balances = new Map<string, BalanceDetails>();

  // Initialize all participants
  participants.forEach(p => {
    balances.set(p.id, {
      participantId: p.id,
      participant: p,
      totalPaid: 0,
      totalConsumed: 0,
      netBalance: 0
    });
  });

  // Process only EXPENSE type (not income or transfer)
  expenses.filter(e => e.type === 'expense').forEach(expense => {
    // Payer gets credit (they paid)
    if (expense.paidBy && balances.has(expense.paidBy)) {
      const payer = balances.get(expense.paidBy)!;
      payer.totalPaid += expense.amount;
    }

    // Consumers get debited (their share)
    expense.split.forEach(split => {
      if (balances.has(split.participantId)) {
        const consumer = balances.get(split.participantId)!;
        consumer.totalConsumed += split.amount;
      }
    });
  });

  // Calculate net balance for each participant
  balances.forEach(b => {
    b.netBalance = b.totalPaid - b.totalConsumed;
  });

  return balances;
}

// ============================================
// APPLY TRANSFERS (PHASE 2)
// ============================================

/**
 * Apply existing transfers to adjust balances
 * Transfers count as payments for the sender (reduces their debt)
 */
export function applyTransfers(
  balances: Map<string, BalanceDetails>,
  expenses: TripExpense[]
): Map<string, BalanceDetails> {
  // Create a deep copy to avoid mutation
  const adjustedBalances = new Map<string, BalanceDetails>();
  balances.forEach((value, key) => {
    adjustedBalances.set(key, { ...value });
  });

  // Apply transfers
  expenses.filter(e => e.type === 'transfer').forEach(transfer => {
    if (transfer.from && transfer.transferredTo) {
      // Sender paid back (reduce their debt / increase their credit)
      if (adjustedBalances.has(transfer.from)) {
        const sender = adjustedBalances.get(transfer.from)!;
        sender.netBalance += transfer.amount;
        // Also count this transfer as money paid by the sender
        sender.totalPaid += transfer.amount;
      }

      // Receiver got paid (reduce their credit / their receivable)
      if (adjustedBalances.has(transfer.transferredTo)) {
        const receiver = adjustedBalances.get(transfer.transferredTo)!;
        receiver.netBalance -= transfer.amount;
      }
    }
  });

  return adjustedBalances;
}

// ============================================
// MIN-CASH-FLOW ALGORITHM (PHASE 3)
// ============================================

/**
 * Find which expenses contributed to a specific debt relationship
 */
function findContributingExpenses(
  debtorId: string,
  creditorId: string,
  expenses: TripExpense[]
): { title: string; amount: number }[] {
  return expenses
    .filter(e =>
      e.type === 'expense' &&
      e.paidBy === creditorId &&
      e.split.some(s => s.participantId === debtorId && s.amount > 0)
    )
    .map(e => ({
      title: e.title,
      amount: e.split.find(s => s.participantId === debtorId)?.amount || 0
    }));
}

/**
 * Calculate minimum transactions needed to settle all debts
 * Uses a greedy algorithm to match largest debtor with largest creditor
 */
export function calculateMinCashFlowSettlements(
  balances: Map<string, BalanceDetails>,
  expenses: TripExpense[]
): Settlement[] {
  const settlements: Settlement[] = [];

  // Separate into debtors (negative balance) and creditors (positive balance)
  const debtors: BalanceDetails[] = [];
  const creditors: BalanceDetails[] = [];

  // Validate Zero Sum (approximate)
  let totalNet = 0;
  balances.forEach(b => totalNet += b.netBalance);

  // If not zero-sum, force adjustment to closest valid state (distribute error) or warn
  if (Math.abs(totalNet) > 0.1) {
    console.warn('MinCashFlow: Total net balance is not zero (Sum: ' + totalNet + '). Data might be inconsistent.');
  }

  balances.forEach(b => {
    // Only consider significant balances
    if (b.netBalance < -0.01) {
      debtors.push({ ...b });
    } else if (b.netBalance > 0.01) {
      creditors.push({ ...b });
    }
  });

  // Sort by absolute magnitude (largest first)
  debtors.sort((a, b) => a.netBalance - b.netBalance); // Most negative first (-100 before -10)
  creditors.sort((a, b) => b.netBalance - a.netBalance); // Most positive first (100 before 10)

  // Greedy matching
  while (debtors.length > 0 && creditors.length > 0) {
    const maxDebtor = debtors[0];
    const maxCreditor = creditors[0];

    // The amount to settle is the minimum of what debtor owes and what creditor is owed
    const settleAmount = Math.min(
      Math.abs(maxDebtor.netBalance),
      maxCreditor.netBalance
    );

    // Find details
    const contributing = findContributingExpenses(
      maxDebtor.participantId,
      maxCreditor.participantId,
      expenses
    );

    settlements.push({
      from: maxDebtor.participant,
      to: maxCreditor.participant,
      amount: parseFloat(settleAmount.toFixed(2)),
      contributingExpenses: contributing
    });

    // Update balances
    maxDebtor.netBalance += settleAmount;
    maxCreditor.netBalance -= settleAmount;

    // Remove if settled (or close enough)
    if (Math.abs(maxDebtor.netBalance) < 0.01) debtors.shift();
    if (Math.abs(maxCreditor.netBalance) < 0.01) creditors.shift();
  }

  return settlements;
}

// ============================================
// COMPLETE SETTLEMENT CALCULATION
// ============================================

/**
 * Complete settlement calculation pipeline
 * Combines all three phases: raw balances, apply transfers, min-cash-flow
 */
export function calculateSettlements(
  trip: Trip,
  expenses: TripExpense[]
): {
  balances: Map<string, BalanceDetails>;
  settlements: Settlement[];
  totalExpenses: number;
} {
  // Phase 1: Calculate raw balances
  const rawBalances = calculateRawBalances(trip.participants, expenses);

  // Phase 2: Apply existing transfers
  const adjustedBalances = applyTransfers(rawBalances, expenses);

  // Phase 3: Calculate optimized settlements
  const settlements = calculateMinCashFlowSettlements(adjustedBalances, expenses);

  // Calculate total expenses
  const totalExpenses = expenses
    .filter(e => e.type === 'expense')
    .reduce((sum, e) => sum + e.amount, 0);

  return {
    balances: adjustedBalances,
    settlements,
    totalExpenses
  };
}

// ============================================
// SHARE TEXT GENERATION
// ============================================

/**
 * Generate formatted share text for WhatsApp/SMS
 */
export function generateShareText(
  trip: Trip,
  expenses: TripExpense[],
  settlements: Settlement[],
  balances: Map<string, BalanceDetails>
): string {
  const totalSpent = expenses
    .filter(e => e.type === 'expense')
    .reduce((sum, e) => sum + e.amount, 0);

  const tripDate = new Date(trip.createdAt).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Find current user's balance
  const myParticipant = trip.participants.find(p => p.isCurrentUser);
  const myBalance = myParticipant ? balances.get(myParticipant.id) : null;

  let text = `✈️ *${trip.name}*\n`;
  text += `📅 ${tripDate}\n\n`;

  text += `💰 *Trip Summary*\n`;
  text += `Total Spent: ₹${totalSpent.toFixed(2)}\n\n`;

  // Per-person breakdown
  text += `📊 *Per Person Breakdown*\n`;
  trip.participants.forEach(p => {
    const balance = balances.get(p.id);
    if (balance) {
      const label = p.isCurrentUser ? `${p.name} (Me)` : p.name;
      text += `${label}: Paid ₹${balance.totalPaid.toFixed(2)}, Share ₹${balance.totalConsumed.toFixed(2)}\n`;
    }
  });
  text += '\n';

  // Current user status
  if (myBalance) {
    text += `📊 *Your Status (Me)*\n`;
    text += `Total Paid: ₹${myBalance.totalPaid.toFixed(2)}\n`;
    text += `Actual Share: ₹${myBalance.totalConsumed.toFixed(2)}\n`;

    if (myBalance.netBalance > 0.01) {
      text += `✅ You get back: ₹${myBalance.netBalance.toFixed(2)}\n\n`;
    } else if (myBalance.netBalance < -0.01) {
      text += `⚠️ You owe: ₹${Math.abs(myBalance.netBalance).toFixed(2)}\n\n`;
    } else {
      text += `✓ You're all settled!\n\n`;
    }
  }

  // Final settlements
  if (settlements.length > 0) {
    text += `🔄 *Final Settlement*\n`;
    settlements.forEach((s, i) => {
      const fromName = s.from.isCurrentUser ? 'Me' : s.from.name;
      const toName = s.to.isCurrentUser ? 'Me' : s.to.name;
      text += `${i + 1}. ${fromName} ➡️ ${toName}: ₹${s.amount.toFixed(2)}\n`;
      if (s.contributingExpenses.length > 0) {
        const expenseNames = s.contributingExpenses.slice(0, 3).map(e => e.title).join(', ');
        text += `   (For: ${expenseNames})\n`;
      }
    });
  } else {
    text += `✅ *All Settled!*\n`;
    text += `No pending settlements.\n`;
  }

  return text;
}

// ============================================
// EXPENSE GROUPING (SMART CATEGORIZATION)
// ============================================

export interface ExpenseGroup {
  category: string;
  keyword: string;
  expenses: TripExpense[];
  totalAmount: number;
  isGroup: boolean;
}

/**
 * Group similar expenses by category and keyword
 */
export function groupExpensesBySimilarity(expenses: TripExpense[]): ExpenseGroup[] {
  const groups: Map<string, ExpenseGroup> = new Map();

  expenses.filter(e => e.type === 'expense').forEach(expense => {
    // Extract grouping key (category + first significant word)
    const keyword = expense.title.split(' ')[0].toLowerCase();
    const groupKey = `${expense.category}_${keyword}`;

    if (groups.has(groupKey)) {
      const group = groups.get(groupKey)!;
      group.expenses.push(expense);
      group.totalAmount += expense.amount;
    } else {
      groups.set(groupKey, {
        category: expense.category,
        keyword: expense.title.split(' ')[0],
        expenses: [expense],
        totalAmount: expense.amount,
        isGroup: false
      });
    }
  });

  // Mark as group if 2+ items
  groups.forEach(g => {
    g.isGroup = g.expenses.length > 1;
  });

  return Array.from(groups.values()).sort((a, b) =>
    new Date(b.expenses[0].date).getTime() - new Date(a.expenses[0].date).getTime()
  );
}

// ============================================
// COST BREAKDOWN ANALYSIS
// ============================================

export interface CostBreakdownItem {
  participant: TripParticipant;
  totalPaid: number;
  totalConsumed: number;
  netBalance: number;
  notes: string[];
}

/**
 * Generate detailed cost breakdown with explanatory notes
 */
export function generateCostBreakdown(
  trip: Trip,
  expenses: TripExpense[],
  balances: Map<string, BalanceDetails>
): CostBreakdownItem[] {
  return trip.participants.map(p => {
    const balance = balances.get(p.id);
    const notes: string[] = [];

    // Find expenses where this participant was excluded
    expenses.filter(e => e.type === 'expense').forEach(expense => {
      const split = expense.split.find(s => s.participantId === p.id);
      if (!split || split.amount === 0) {
        notes.push(`Excluded from "${expense.title}"`);
      } else {
        const equalShare = expense.amount / expense.split.length;
        if (Math.abs(split.amount - equalShare) > 0.01) {
          notes.push(`Custom split in "${expense.title}" (₹${split.amount.toFixed(2)})`);
        }
      }
    });

    return {
      participant: p,
      totalPaid: balance?.totalPaid || 0,
      totalConsumed: balance?.totalConsumed || 0,
      netBalance: balance?.netBalance || 0,
      notes: notes.slice(0, 5) // Limit to 5 notes
    };
  });
}
