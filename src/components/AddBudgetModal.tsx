import { useState } from 'react';
import { X, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { useBudgets } from '../hooks/useFirestoreSync';

interface AddBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBudgetAdded: () => void;
}

const AddBudgetModal = ({ isOpen, onClose, onBudgetAdded }: AddBudgetModalProps) => {
  const { addBudget } = useBudgets();
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const predefinedCategories = [
    'Food & Dining',
    'Transportation',
    'Shopping',
    'Entertainment',
    'Bills & Utilities',
    'Healthcare',
    'Education',
    'Travel',
    'Others'
  ];

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalCategory = showCustom ? customCategory : category;
    if (!finalCategory || !amount) return;

    const now = new Date();
    const budget = {
      id: `budget_${Date.now()}`,
      userId: '',
      category: finalCategory,
      amount: parseFloat(amount),
      period: 'monthly' as const,
      startDate: now,
      endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      createdAt: now,
    };

    try {
      await addBudget(budget);
      
      setCategory('');
      setAmount('');
      setCustomCategory('');
      setShowCustom(false);
      onClose();
      onBudgetAdded();
    } catch (error) {
      console.error('Error adding budget:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Budget</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Select Category
            </label>
            {!showCustom ? (
              <div className="space-y-2">
                {predefinedCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                      category === cat
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-900 dark:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowCustom(true)}
                  className="w-full text-left px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500 text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-all"
                >
                  + Add Custom Category
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Enter custom category name"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowCustom(false);
                    setCustomCategory('');
                  }}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-500"
                >
                  ← Back to predefined categories
                </button>
              </div>
            )}
          </div>

          {/* Budget Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Budget Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                ₹
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter amount"
                required
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={(!category && !customCategory) || !amount}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Wallet className="w-5 h-5" />
            <span>Create Budget</span>
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default AddBudgetModal;
