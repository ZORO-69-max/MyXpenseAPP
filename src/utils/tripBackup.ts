import type { Trip, TripExpense } from '../types';

export interface TripBackupData {
  version: string;
  exportDate: string;
  trip: Trip & { expenses: TripExpense[] };
  summary: {
    totalExpenses: number;
    totalParticipants: number;
    expenseCount: number;
    dateRange: {
      start: string;
      end: string;
    };
  };
}

export const createTripBackup = (trip: Trip, expenses: TripExpense[]): TripBackupData => {
  const expenseAmounts = expenses.filter(e => e.type === 'expense').map(e => e.amount);
  const startDate = expenses.length > 0 
    ? new Date(Math.min(...expenses.map(e => new Date(e.date).getTime()))) 
    : new Date(trip.createdAt);
  const endDate = expenses.length > 0
    ? new Date(Math.max(...expenses.map(e => new Date(e.date).getTime())))
    : new Date();

  return {
    version: '1.0',
    exportDate: new Date().toISOString(),
    trip: {
      ...trip,
      expenses
    },
    summary: {
      totalExpenses: expenseAmounts.reduce((sum, amt) => sum + amt, 0),
      totalParticipants: trip.participants.length,
      expenseCount: expenses.filter(e => e.type === 'expense').length,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      }
    }
  };
};

export const downloadTripBackup = (trip: Trip, expenses: TripExpense[]) => {
  const backupData = createTripBackup(trip, expenses);
  const jsonString = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const sanitizedTripName = trip.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const timestamp = new Date().toISOString().split('T')[0];
  
  link.href = url;
  link.download = `${sanitizedTripName}_backup_${timestamp}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportTripAsCSV = (trip: Trip, expenses: TripExpense[]) => {
  const headers = ['Date', 'Category', 'Amount', 'Paid By', 'Type'];
  const rows = expenses
    .filter(e => e.type === 'expense')
    .map(expense => [
      new Date(expense.date).toLocaleDateString(),
      expense.category || '',
      expense.amount,
      trip.participants.find(p => p.id === expense.paidBy)?.name || 'Unknown',
      expense.type
    ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const sanitizedTripName = trip.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const timestamp = new Date().toISOString().split('T')[0];

  link.href = url;
  link.download = `${sanitizedTripName}_expenses_${timestamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const generateBackupReport = (trip: Trip, expenses: TripExpense[]): string => {
  const backup = createTripBackup(trip, expenses);
  const expensesByCategory: Record<string, number> = {};
  
  expenses
    .filter(e => e.type === 'expense')
    .forEach(e => {
      expensesByCategory[e.category || 'Uncategorized'] = 
        (expensesByCategory[e.category || 'Uncategorized'] || 0) + e.amount;
    });

  let report = `TRIP EXPENSE BACKUP REPORT\n`;
  report += `${'='.repeat(50)}\n\n`;
  report += `Trip: ${trip.name}\n`;
  report += `Created: ${new Date(trip.createdAt).toLocaleDateString()}\n`;
  report += `Exported: ${new Date().toLocaleString()}\n\n`;
  
  report += `SUMMARY\n`;
  report += `${'−'.repeat(50)}\n`;
  report += `Total Expenses: ₹${backup.summary.totalExpenses.toFixed(2)}\n`;
  report += `Number of Expenses: ${backup.summary.expenseCount}\n`;
  report += `Participants: ${backup.summary.totalParticipants}\n`;
  report += `Date Range: ${backup.summary.dateRange.start} to ${backup.summary.dateRange.end}\n\n`;
  
  report += `EXPENSES BY CATEGORY\n`;
  report += `${'−'.repeat(50)}\n`;
  Object.entries(expensesByCategory).forEach(([category, amount]) => {
    report += `${category}: ₹${amount.toFixed(2)}\n`;
  });
  
  report += `\nPARTICIPANTS\n`;
  report += `${'−'.repeat(50)}\n`;
  trip.participants.forEach(p => {
    const paidByThis = expenses
      .filter(e => e.type === 'expense' && e.paidBy === p.id)
      .reduce((sum, e) => sum + e.amount, 0);
    const owesAmount = expenses
      .filter(e => e.type === 'expense')
      .reduce((sum, e) => {
        const split = e.split.find(s => s.participantId === p.id);
        return sum + (split?.amount || 0);
      }, 0);
    
    const balance = paidByThis - owesAmount;
    report += `${p.name}: Paid ₹${paidByThis.toFixed(2)}, Owes ₹${owesAmount.toFixed(2)} (Balance: ${balance >= 0 ? '+' : ''}₹${balance.toFixed(2)})\n`;
  });
  
  return report;
};
