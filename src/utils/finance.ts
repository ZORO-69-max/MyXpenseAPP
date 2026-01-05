import type { Transaction } from '../types';

export interface TripSettlement {
    id: string;
    amount: number;
    debtType: 'lent' | 'borrowed' | 'settlement_in' | 'settlement_out';
    debtStatus: 'pending' | 'settled';
    [key: string]: any; // Allow other properties
}

/**
 * Calculates the total balance and other financial stats based on transactions and settlements.
 * 
 * Logic:
 * Balance = (Total Income + Borrowed Pending) - (Total Expenses + Lent Pending)
 * 
 * - Income: Standard income + Transfers FROM Secret Vault.
 * - Expenses: Standard expenses + Transfers TO Secret Vault.
 * - Debts: 
 *   - Lent (Pending): Treated as money OUT (decreases balance temporarily).
 *   - Borrowed (Pending): Treated as money IN (increases balance temporarily).
 *   - Settled Debts: Neutral (ignored).
 *   - Trip Settlements: Included in Pending Debts calculation.
 */
export const calculateFinanceStats = (
    transactions: Transaction[],
    tripSettlements: TripSettlement[] = []
) => {
    let income = 0;
    let expenses = 0;
    let vaultOut = 0; // Track transfers to vault separately
    let pendingLent = 0;
    let pendingBorrowed = 0;

    // Spending stats
    let weekSpending = 0;
    let monthSpending = 0;
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const checkSpending = (t: Transaction, amount: number) => {
        const tTime = new Date(t.date).getTime();
        if (tTime >= weekAgo) weekSpending += amount;
        if (tTime >= monthAgo) monthSpending += amount;
    };

    // Process Transactions
    transactions.forEach(t => {
        // 1. Debt Logic
        if (t.type === 'debt' || t.debtType) {
            // Only pending debts affect the balance (Liability/Asset model)
            if (t.debtStatus === 'pending') {
                // Calculate remaining amount after partial settlements
                const settledSoFar = (t as any).settledAmount || 0;
                const remainingAmount = Math.max(0, t.amount - settledSoFar);

                if (t.debtType === 'lent') {
                    pendingLent += remainingAmount;
                } else if (t.debtType === 'borrowed') {
                    pendingBorrowed += remainingAmount;
                }
            } else {
                // Handle Settlements (Repayments) that are fully settled/recorded
                // If this is a Settlement Transaction (not the debt itself, but the payment)
                if (t.debtType === 'settlement_in') {
                    income += t.amount;
                } else if (t.debtType === 'settlement_out') {
                    expenses += t.amount;
                }
            }
        }
        // 2. Transfer Logic (Secret Vault)
        else if (t.type === 'transfer') {
            if (t.transferFrom === 'secret_vault') {
                income += t.amount;
            } else if (t.transferTo === 'secret_vault') {
                vaultOut += t.amount;
                // Excluded from 'expenses' and 'spending' stats as per user request
            }
        }
        // 3. Income
        else if (t.type === 'income') {
            income += t.amount;
        }
        // 4. Standard Expense
        else {
            expenses += t.amount;
            checkSpending(t, t.amount);
        }
    });

    // Process Trip Settlements (Pending ones affect balance)
    tripSettlements.forEach(s => {
        if (s.debtStatus === 'pending') {
            if (s.debtType === 'lent') {
                pendingLent += s.amount;
            } else if (s.debtType === 'borrowed') {
                pendingBorrowed += s.amount;
            }
        } else {
            // Handle explicit settlements in trip data
            if (s.debtType === 'settlement_in') {
                income += s.amount;
            } else if (s.debtType === 'settlement_out') {
                expenses += s.amount;
            }
        }
    });

    // Final Balance Calculation
    // Balance = (Income + Borrowed) - (Expenses + VaultOut + Lent)
    // "Deleting from final balance" logic: Only Pending debts reduce the balance. Settled ones vanish.
    const balance = (income + pendingBorrowed) - (expenses + vaultOut + pendingLent);

    return {
        balance,
        income,
        expenses,
        pendingLent,
        pendingBorrowed,
        spending: {
            week: weekSpending,
            month: monthSpending
        }
    };
};
