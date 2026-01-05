import type { Transaction, Budget, Goal } from '../types';

interface InsightContext {
    transactions: Transaction[];
    budgets: Budget[];
    goals: Goal[];
    userName?: string;
}

export interface Insight {
    message: string;
    type: 'budget' | 'spending' | 'savings' | 'goal' | 'debt' | 'general';
    icon: string;
    priority: number;
}

class InsightGenerator {
    private lastInsightType: string | null = null;

    getInsight(context: InsightContext): Insight {
        const insights = this.generateAllInsights(context);

        // Filter out the last shown type for variety
        const filtered = insights.filter(i => i.type !== this.lastInsightType);
        const pool = filtered.length > 0 ? filtered : insights;

        // Sort by priority and pick the highest
        pool.sort((a, b) => b.priority - a.priority);
        const selected = pool[0] || this.getFallbackInsight(context);

        this.lastInsightType = selected.type;
        return selected;
    }

    private generateAllInsights(context: InsightContext): Insight[] {
        const insights: Insight[] = [];

        insights.push(...this.getBudgetInsights(context));
        insights.push(...this.getSpendingTrendInsights(context));
        insights.push(...this.getSavingsInsights(context));
        insights.push(...this.getGoalInsights(context));
        insights.push(...this.getDebtInsights(context));

        return insights.filter(i => i.priority > 0);
    }

    private getBudgetInsights(context: InsightContext): Insight[] {
        const insights: Insight[] = [];
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        context.budgets.forEach(budget => {
            const monthlyTransactions = context.transactions.filter(t => {
                const tDate = new Date(t.date);
                return (
                    t.type === 'expense' &&
                    t.category === budget.category &&
                    tDate.getMonth() === currentMonth &&
                    tDate.getFullYear() === currentYear
                );
            });

            const spent = monthlyTransactions.reduce((sum, t) => sum + t.amount, 0);
            const percentUsed = (spent / budget.amount) * 100;

            if (percentUsed > 100) {
                insights.push({
                    message: `🚨 You've exceeded your ${budget.category} budget by ₹${(spent - budget.amount).toFixed(0)}! Time to cut back.`,
                    type: 'budget',
                    icon: '🚨',
                    priority: 10
                });
            } else if (percentUsed > 80) {
                insights.push({
                    message: `⚠️ You've used ${percentUsed.toFixed(0)}% of your ${budget.category} budget. ${100 - percentUsed > 0 ? `₹${((budget.amount - spent)).toFixed(0)} left!` : ''}`,
                    type: 'budget',
                    icon: '⚠️',
                    priority: 8
                });
            } else if (percentUsed < 50 && spent > 0) {
                insights.push({
                    message: `✨ Great job! You're only using ${percentUsed.toFixed(0)}% of your ${budget.category} budget. Keep it up!`,
                    type: 'budget',
                    icon: '✨',
                    priority: 5
                });
            }
        });

        return insights;
    }

    private getSpendingTrendInsights(context: InsightContext): Insight[] {
        const insights: Insight[] = [];
        const now = new Date();

        // This week vs last week
        const thisWeekStart = new Date(now);
        thisWeekStart.setDate(now.getDate() - now.getDay());
        thisWeekStart.setHours(0, 0, 0, 0);

        const lastWeekStart = new Date(thisWeekStart);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);

        const thisWeekSpending = context.transactions
            .filter(t => t.type === 'expense' && new Date(t.date) >= thisWeekStart)
            .reduce((sum, t) => sum + t.amount, 0);

        const lastWeekSpending = context.transactions
            .filter(t => {
                const date = new Date(t.date);
                return t.type === 'expense' && date >= lastWeekStart && date < thisWeekStart;
            })
            .reduce((sum, t) => sum + t.amount, 0);

        if (lastWeekSpending > 0) {
            const change = ((thisWeekSpending - lastWeekSpending) / lastWeekSpending) * 100;

            if (change > 20) {
                insights.push({
                    message: `📈 Your spending is up ${change.toFixed(0)}% this week (₹${thisWeekSpending.toFixed(0)}). Consider reviewing your expenses.`,
                    type: 'spending',
                    icon: '📈',
                    priority: 7
                });
            } else if (change < -20) {
                insights.push({
                    message: `📉 Awesome! Your spending is down ${Math.abs(change).toFixed(0)}% this week. You're saving ₹${(lastWeekSpending - thisWeekSpending).toFixed(0)} more!`,
                    type: 'spending',
                    icon: '📉',
                    priority: 6
                });
            }
        }

        // Top spending category
        const categoryTotals = new Map<string, number>();
        context.transactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                const current = categoryTotals.get(t.category) || 0;
                categoryTotals.set(t.category, current + t.amount);
            });

        if (categoryTotals.size > 0) {
            const topCategory = Array.from(categoryTotals.entries())
                .sort((a, b) => b[1] - a[1])[0];

            if (topCategory && topCategory[1] > 0) {
                insights.push({
                    message: `💰 ${topCategory[0]} is your biggest expense at ₹${topCategory[1].toFixed(0)}. Look for savings opportunities here!`,
                    type: 'spending',
                    icon: '💰',
                    priority: 4
                });
            }
        }

        return insights;
    }

    private getSavingsInsights(context: InsightContext): Insight[] {
        const insights: Insight[] = [];

        const income = context.transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const expenses = context.transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const savings = income - expenses;

        if (income > 0) {
            const savingsRate = (savings / income) * 100;

            if (savingsRate > 30) {
                insights.push({
                    message: `🎯 Outstanding! You're saving ${savingsRate.toFixed(0)}% of your income. Financial freedom is within reach!`,
                    type: 'savings',
                    icon: '🎯',
                    priority: 6
                });
            } else if (savingsRate > 10) {
                insights.push({
                    message: `💪 You're saving ${savingsRate.toFixed(0)}% of your income. Aim for 20-30% to build wealth faster!`,
                    type: 'savings',
                    icon: '💪',
                    priority: 5
                });
            } else if (savingsRate > 0) {
                insights.push({
                    message: `🌱 You're saving ${savingsRate.toFixed(0)}% of your income. Small steps matter—try to increase this gradually!`,
                    type: 'savings',
                    icon: '🌱',
                    priority: 4
                });
            } else if (savings < 0) {
                insights.push({
                    message: `⚠️ You're spending ₹${Math.abs(savings).toFixed(0)} more than you earn. Time to review your expenses!`,
                    type: 'savings',
                    icon: '⚠️',
                    priority: 9
                });
            }
        }

        return insights;
    }

    private getGoalInsights(context: InsightContext): Insight[] {
        const insights: Insight[] = [];

        context.goals.forEach(goal => {
            const progress = (goal.currentAmount / goal.targetAmount) * 100;

            if (progress >= 100) {
                insights.push({
                    message: `🎉 Congratulations! You've reached your "${goal.name}" goal of ₹${goal.targetAmount}!`,
                    type: 'goal',
                    icon: '🎉',
                    priority: 8
                });
            } else if (progress >= 75) {
                insights.push({
                    message: `🚀 Almost there! You're ${progress.toFixed(0)}% towards your "${goal.name}" goal. Just ₹${(goal.targetAmount - goal.currentAmount).toFixed(0)} to go!`,
                    type: 'goal',
                    icon: '🚀',
                    priority: 6
                });
            } else if (progress >= 50) {
                insights.push({
                    message: `💫 Halfway there! Your "${goal.name}" goal is ${progress.toFixed(0)}% complete. Keep pushing!`,
                    type: 'goal',
                    icon: '💫',
                    priority: 5
                });
            } else if (goal.currentAmount > 0) {
                insights.push({
                    message: `🌟 Great start on "${goal.name}"! You've saved ₹${goal.currentAmount.toFixed(0)} so far.`,
                    type: 'goal',
                    icon: '🌟',
                    priority: 3
                });
            }
        });

        return insights;
    }

    private getDebtInsights(context: InsightContext): Insight[] {
        const insights: Insight[] = [];

        const pendingDebts = context.transactions.filter(
            t => t.type === 'debt' && t.debtStatus === 'pending'
        );

        const getRemainingAmount = (t: Transaction) => {
            // Trip settlements are already calculated as "remaining/outstanding"
            if ((t as any).isTripSettlement) return t.amount;

            // Regular debts might be partially settled
            // Ensure we don't return negative values
            return Math.max(0, t.amount - ((t as any).settledAmount || 0));
        };

        const totalLent = pendingDebts
            .filter(t => t.debtType === 'lent')
            .reduce((sum, t) => sum + getRemainingAmount(t), 0);

        const totalBorrowed = pendingDebts
            .filter(t => t.debtType === 'borrowed')
            .reduce((sum, t) => sum + getRemainingAmount(t), 0);

        if (totalLent > 0) {
            insights.push({
                message: `💸 You have ₹${totalLent.toFixed(0)} lent out. Follow up with ${pendingDebts.filter(t => t.debtType === 'lent').length} ${pendingDebts.filter(t => t.debtType === 'lent').length === 1 ? 'person' : 'people'} to recover it!`,
                type: 'debt',
                icon: '💸',
                priority: 7
            });
        }

        if (totalBorrowed > 0) {
            insights.push({
                message: `⏰ You owe ₹${totalBorrowed.toFixed(0)} to ${pendingDebts.filter(t => t.debtType === 'borrowed').length} ${pendingDebts.filter(t => t.debtType === 'borrowed').length === 1 ? 'person' : 'people'}. Clear your debts to improve your finances!`,
                type: 'debt',
                icon: '⏰',
                priority: 8
            });
        }

        return insights;
    }

    private getFallbackInsight(context: InsightContext): Insight {
        const userName = context.userName || 'there';
        const fallbacks = [
            `👋 Hey ${userName}! Track more transactions to unlock personalized insights.`,
            `📊 Start by adding your income and expenses to see patterns emerge!`,
            `💡 Set up budgets and goals to get smart recommendations.`,
            `✨ The more you track, the better insights I can provide!`
        ];

        return {
            message: fallbacks[Math.floor(Math.random() * fallbacks.length)],
            type: 'general',
            icon: '💡',
            priority: 1
        };
    }
}

export const insightGenerator = new InsightGenerator();
