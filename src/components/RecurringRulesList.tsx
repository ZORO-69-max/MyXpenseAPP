import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Edit2, Calendar, Repeat, PauseCircle, PlayCircle } from 'lucide-react';
import type { RecurringRule } from '../types';

interface RecurringRulesListProps {
    rules: RecurringRule[];
    onDelete: (id: string) => void;
    onToggleActive: (id: string, isActive: boolean) => void;
    onEdit: (rule: RecurringRule) => void;
}

const RecurringRulesList = ({ rules, onDelete, onToggleActive, onEdit }: RecurringRulesListProps) => {
    const getFrequencyLabel = (activeDays: number[]) => {
        if (activeDays.length === 7) return 'Daily';
        if (activeDays.length === 5 && !activeDays.includes(0) && !activeDays.includes(6)) return 'Weekdays';
        if (activeDays.length === 2 && activeDays.includes(0) && activeDays.includes(6)) return 'Weekends';

        // Custom days label
        const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return activeDays.map(d => dayLabels[d]).join(', ');
    };

    if (rules.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Repeat className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No recurring payments set up yet.</p>
                <p className="text-sm opacity-70">Add regular expenses like bills, gym, or subscriptions.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <AnimatePresence>
                {rules.map((rule) => (
                    <motion.div
                        key={rule.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`p-4 rounded-xl border transition-colors ${rule.isActive
                            ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
                            : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 opacity-75'
                            }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${rule.isActive ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-200 dark:bg-gray-800 text-gray-400'
                                    }`}>
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className={`font-medium ${!rule.isActive && 'line-through text-gray-500'}`}>
                                        {rule.title}
                                    </h3>
                                    <div className="flex items-center text-xs text-gray-500 gap-2">
                                        <span className="capitalize px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">
                                            {rule.category}
                                        </span>
                                        <span>•</span>
                                        <span>{getFrequencyLabel(rule.activeDays)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-gray-900 dark:text-white">
                                    ₹{rule.baseAmount}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end space-x-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                            <button
                                onClick={() => onToggleActive(rule.id, !rule.isActive)}
                                className={`p-2 rounded-lg text-xs font-medium flex items-center space-x-1 ${rule.isActive
                                    ? 'text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                                    : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                                    }`}
                            >
                                {rule.isActive ? (
                                    <>
                                        <PauseCircle className="w-4 h-4" />
                                        <span>Pause</span>
                                    </>
                                ) : (
                                    <>
                                        <PlayCircle className="w-4 h-4" />
                                        <span>Resume</span>
                                    </>
                                )}
                            </button>

                            <button
                                onClick={() => onEdit(rule)}
                                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                                onClick={() => onDelete(rule.id)}
                                className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default RecurringRulesList;
