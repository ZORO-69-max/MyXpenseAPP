import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, ChevronDown, ChevronRight, Home, Wallet, Target,
    PiggyBank, Plane, Shield, BarChart3, Bot, ArrowLeft
} from 'lucide-react';

interface FeatureStep {
    title: string;
    description: string;
    tips?: string[];
}

interface Feature {
    id: string;
    icon: any;
    title: string;
    description: string;
    category: string;
    steps: FeatureStep[];
}

const features: Feature[] = [
    {
        id: 'dashboard',
        icon: Home,
        title: 'Dashboard Overview',
        description: 'Your financial command center with real-time insights',
        category: 'Getting Started',
        steps: [
            {
                title: 'Total Balance Card',
                description: 'Shows your current balance (Income - Expenses - Pending Settlements). Click the eye icon to hide/show the amount.',
                tips: [
                    'The balance updates in real-time as you add transactions',
                    'Pending settlements from trips are automatically deducted'
                ]
            },
            {
                title: 'Quick Actions',
                description: 'Tap the floating + button to quickly add income, expenses, or record debts.',
                tips: ['Use the Smart Parser for natural language input like "Paid 500 for groceries"']
            },
            {
                title: 'Recent Transactions',
                description: 'View your latest transactions with category icons and amounts. Swipe left on any transaction to edit or delete.',
            }
        ]
    },
    {
        id: 'transactions',
        icon: Wallet,
        title: 'Managing Transactions',
        description: 'Add, edit, and categorize your income and expenses',
        category: 'Core Features',
        steps: [
            {
                title: 'Adding Transactions',
                description: 'Click the + button and choose Income or Expense. Fill in the amount, category, and optional note.',
                tips: [
                    'Use categories to track spending patterns',
                    'Add receipts using the camera icon',
                    'Set recurring transactions for regular bills'
                ]
            },
            {
                title: 'Smart Parser',
                description: 'Type natural sentences like "Earned 5000 from freelance" and the AI will parse it into a transaction.',
                tips: ['Works for income, expenses, and debts', 'Automatically detects categories']
            },
            {
                title: 'Editing & Deleting',
                description: 'Swipe left on any transaction to reveal edit and delete options. Changes sync across all devices.',
            }
        ]
    },
    {
        id: 'budgets',
        icon: Target,
        title: 'Budget Planning',
        description: 'Set spending limits and track your progress',
        category: 'Core Features',
        steps: [
            {
                title: 'Creating a Budget',
                description: 'Go to Budgets → Add Budget. Choose a category, set amount, and select the time period (monthly/weekly).',
                tips: [
                    'Start with major categories like Food, Transport, Entertainment',
                    'Review and adjust budgets monthly based on actual spending'
                ]
            },
            {
                title: 'Tracking Progress',
                description: 'Budget cards show spent amount, remaining balance, and a visual progress indicator.',
                tips: [
                    'Red indicates over-budget',
                    'Yellow means you\'re approaching the limit',
                    'Green shows healthy spending'
                ]
            },
            {
                title: 'Budget Insights',
                description: 'AI Insights will warn you when you\'re close to exceeding a budget.',
            }
        ]
    },
    {
        id: 'goals',
        icon: PiggyBank,
        title: 'Savings Goals',
        description: 'Set financial goals and track your progress',
        category: 'Core Features',
        steps: [
            {
                title: 'Creating a Goal',
                description: 'Navigate to Goals → Add Goal. Set a target amount, deadline, and optional description.',
                tips: [
                    'Break large goals into milestones',
                    'Set realistic deadlines to stay motivated'
                ]
            },
            {
                title: 'Contributing to Goals',
                description: 'Click on a goal and tap "Add Money" to contribute. Track your progress with the visual indicator.',
            },
            {
                title: 'Goal Completion',
                description: 'When you reach 100%, you\'ll get a celebration notification. Mark the goal as complete or adjust the target.',
            }
        ]
    },
    {
        id: 'trips',
        icon: Plane,
        title: 'Trip Expense Tracking',
        description: 'Split expenses with friends and track group spending',
        category: 'Advanced Features',
        steps: [
            {
                title: 'Creating a Trip',
                description: 'Go to Trips → New Trip. Add trip name, participants, and dates.',
                tips: ['Add participants by email or name']
            },
            {
                title: 'Adding Trip Expenses',
                description: 'Open a trip and tap Add Expense. Choose who paid and who should split the cost.',
                tips: [
                    'Use "Split Equally" for simplicity',
                    'Use "Custom Split" for unequal shares'
                ]
            },
            {
                title: 'Settlements',
                description: 'The app calculates who owes whom using optimized settle-up logic. Tap "Settle Up" to mark debts as paid.',
                tips: ['Settlements automatically update your dashboard balance']
            }
        ]
    },
    {
        id: 'vault',
        icon: Shield,
        title: 'Secret Vault',
        description: 'Secure, PIN-protected savings storage',
        category: 'Advanced Features',
        steps: [
            {
                title: 'Setting Up',
                description: 'Navigate to Secret Vault. Create a 4-digit PIN and set a security question for recovery.',
                tips: [
                    'Choose a unique PIN you can remember',
                    'Your vault data is encrypted and synced securely'
                ]
            },
            {
                title: 'Adding Money',
                description: 'Enter the vault with your PIN, then tap "+ Deposit" to add money. Add a note for reference.',
            },
            {
                title: 'Withdrawing Money',
                description: 'Tap "- Withdraw" and enter the amount. The vault tracks all transactions with timestamps.',
            },
            {
                title: 'Total Net Worth',
                description: 'The vault shows your combined wealth: Dashboard Balance + Vault savings.',
            }
        ]
    },
    {
        id: 'analytics',
        icon: BarChart3,
        title: 'Analytics & Reports',
        description: 'Visualize spending patterns and trends',
        category: 'Insights',
        steps: [
            {
                title: 'Spending Breakdown',
                description: 'View pie charts showing spending by category. Identify where most money goes.',
            },
            {
                title: 'Trend Analysis',
                description: 'See line graphs of spending over time. Compare weekly and monthly trends.',
            },
            {
                title: 'Export Reports',
                description: 'Download CSV reports for tax filing or personal records.',
            }
        ]
    },
    {
        id: 'ai',
        icon: Bot,
        title: 'AI Assistant',
        description: 'Get intelligent financial insights and chat support',
        category: 'Insights',
        steps: [
            {
                title: 'AI Insights Card',
                description: 'View personalized spending insights on the dashboard. Tap refresh for new insights.',
                tips: [
                    'Insights are based on your actual spending patterns',
                    'No API calls = No rate limits!'
                ]
            },
            {
                title: 'Deep Analysis',
                description: 'Click "Deep Analysis" for comprehensive financial reports with spending habits, budget tips, and savings strategies.',
            },
            {
                title: 'AI Chat',
                description: 'Ask questions like "How much did I spend on food last month?" and get instant answers.',
            }
        ]
    }
];

const UserManual = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCategory, setExpandedCategory] = useState<string | null>('Getting Started');
    const [expandedFeature, setExpandedFeature] = useState<string | null>(null);

    const categories = Array.from(new Set(features.map(f => f.category)));

    const filteredFeatures = features.filter(feature =>
        feature.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feature.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groupedFeatures = categories.map(category => ({
        name: category,
        features: filteredFeatures.filter(f => f.category === category)
    }));

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shrink-0">
                <div className="max-w-5xl mx-auto px-4 py-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl text-white shadow-lg cursor-pointer" onClick={() => navigate(-1)}>
                            <ArrowLeft className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Manual</h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Complete guide to MyXpense features</p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search features..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
                    {groupedFeatures.map((group) => (
                        group.features.length > 0 && (
                            <div key={group.name} className="space-y-3">
                                {/* Category Header */}
                                <button
                                    onClick={() => setExpandedCategory(expandedCategory === group.name ? null : group.name)}
                                    className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all"
                                >
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{group.name}</h2>
                                    <motion.div
                                        animate={{ rotate: expandedCategory === group.name ? 180 : 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <ChevronDown className="w-5 h-5 text-gray-500" />
                                    </motion.div>
                                </button>

                                {/* Features in Category */}
                                <AnimatePresence>
                                    {expandedCategory === group.name && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="space-y-3 overflow-hidden"
                                        >
                                            {group.features.map((feature) => {
                                                const Icon = feature.icon;
                                                const isExpanded = expandedFeature === feature.id;

                                                return (
                                                    <div
                                                        key={feature.id}
                                                        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                                                    >
                                                        {/* Feature Header */}
                                                        <button
                                                            onClick={() => setExpandedFeature(isExpanded ? null : feature.id)}
                                                            className="w-full p-5 flex items-start gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                                        >
                                                            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl text-white flex-shrink-0">
                                                                <Icon className="w-5 h-5" />
                                                            </div>
                                                            <div className="flex-1 text-left">
                                                                <h3 className="font-bold text-gray-900 dark:text-white mb-1">{feature.title}</h3>
                                                                <p className="text-sm text-gray-600 dark:text-gray-400">{feature.description}</p>
                                                            </div>
                                                            <motion.div
                                                                animate={{ rotate: isExpanded ? 90 : 0 }}
                                                                transition={{ duration: 0.2 }}
                                                                className="flex-shrink-0"
                                                            >
                                                                <ChevronRight className="w-5 h-5 text-gray-400" />
                                                            </motion.div>
                                                        </button>

                                                        {/* Feature Steps */}
                                                        <AnimatePresence>
                                                            {isExpanded && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    className="border-t border-gray-100 dark:border-gray-700"
                                                                >
                                                                    <div className="p-5 space-y-4 bg-gray-50 dark:bg-gray-900/50">
                                                                        {feature.steps.map((step, idx) => (
                                                                            <div key={idx} className="space-y-2">
                                                                                <div className="flex items-start gap-3">
                                                                                    <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                                                                        {idx + 1}
                                                                                    </div>
                                                                                    <div className="flex-1">
                                                                                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                                                                                            {step.title}
                                                                                        </h4>
                                                                                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                                                                            {step.description}
                                                                                        </p>
                                                                                        {step.tips && step.tips.length > 0 && (
                                                                                            <div className="mt-2 space-y-1">
                                                                                                {step.tips.map((tip, tipIdx) => (
                                                                                                    <div key={tipIdx} className="flex items-start gap-2 text-xs text-blue-600 dark:text-blue-400">
                                                                                                        <span className="mt-0.5">💡</span>
                                                                                                        <span>{tip}</span>
                                                                                                    </div>
                                                                                                ))}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                );
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )
                    ))}

                    {filteredFeatures.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-gray-500 dark:text-gray-400">No features found. Try a different search term.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserManual;
