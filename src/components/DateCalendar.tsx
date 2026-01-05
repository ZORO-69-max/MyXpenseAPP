import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import type { Transaction } from '../types';

interface DateCalendarProps {
    transactions: Transaction[];
    onDateSelect: (date: Date) => void;
    selectedDate: Date | null;
}

const DateCalendar = ({ transactions, onDateSelect, selectedDate }: DateCalendarProps) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const daysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const firstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const previousMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    };

    const isToday = (day: number) => {
        const today = new Date();
        return (
            day === today.getDate() &&
            currentMonth.getMonth() === today.getMonth() &&
            currentMonth.getFullYear() === today.getFullYear()
        );
    };

    const isSelected = (day: number) => {
        if (!selectedDate) return false;
        return (
            day === selectedDate.getDate() &&
            currentMonth.getMonth() === selectedDate.getMonth() &&
            currentMonth.getFullYear() === selectedDate.getFullYear()
        );
    };

    const getTransactionsForDay = (day: number) => {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        return transactions.filter(t => {
            const tDate = new Date(t.date);
            return (
                tDate.getDate() === date.getDate() &&
                tDate.getMonth() === date.getMonth() &&
                tDate.getFullYear() === date.getFullYear()
            );
        });
    };

    const hasIncome = (dayTransactions: Transaction[]) => {
        return dayTransactions.some(t => t.type === 'income');
    };

    const hasExpense = (dayTransactions: Transaction[]) => {
        return dayTransactions.some(t => t.type === 'expense');
    };

    const days = [];
    const totalDays = daysInMonth(currentMonth);
    const startDay = firstDayOfMonth(currentMonth);

    // Add empty cells for days before month starts
    for (let i = 0; i < startDay; i++) {
        days.push(<div key={`empty-${i}`} className="aspect-square" />);
    }

    // Add days of the month
    for (let day = 1; day <= totalDays; day++) {
        const dayTransactions = getTransactionsForDay(day);
        const hasTransactions = dayTransactions.length > 0;
        const income = hasIncome(dayTransactions);
        const expense = hasExpense(dayTransactions);

        days.push(
            <motion.button
                key={day}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onDateSelect(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all
          ${isSelected(day)
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg'
                        : isToday(day)
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }
        `}
            >
                <span className={`text-sm font-semibold ${isSelected(day) ? 'text-white' : ''}`}>{day}</span>

                {hasTransactions && (
                    <div className="absolute bottom-1 flex gap-0.5">
                        {income && (
                            <div className={`w-1.5 h-1.5 rounded-full ${isSelected(day) ? 'bg-white' : 'bg-green-500'}`} />
                        )}
                        {expense && (
                            <div className={`w-1.5 h-1.5 rounded-full ${isSelected(day) ? 'bg-white' : 'bg-red-500'}`} />
                        )}
                    </div>
                )}
            </motion.button>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white">
                        <Calendar className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </h3>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={previousMonth}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                </div>
            </div>

            {/* Days of week */}
            <div className="grid grid-cols-7 gap-2 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-2">
                {days}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-6 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>Income</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span>Expense</span>
                </div>
            </div>
        </div>
    );
};

export default DateCalendar;
