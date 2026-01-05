import { useState, useEffect } from 'react';
import { X, Save, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useBudgets } from '../hooks/useFirestoreSync';

interface EditBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  budget: any;
  onUpdate: () => void;
}

const EditBudgetModal = ({ isOpen, onClose, budget, onUpdate }: EditBudgetModalProps) => {
  const { addBudget, removeBudget } = useBudgets();
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (budget) {
      setAmount(budget.amount.toString());
    }
  }, [budget]);

  if (!isOpen || !budget) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Remove old budget and add updated one
      await removeBudget(budget.id);
      await addBudget({ ...budget, amount: parseFloat(amount) });
      onClose();
      onUpdate();
    } catch (error) {
      console.error('Error updating budget:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await removeBudget(budget.id);
      onClose();
      onUpdate();
    } catch (error) {
      console.error('Error deleting budget:', error);
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
        className="relative bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md"
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Budget</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Category (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <div className="px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium">
              {budget.category}
            </div>
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

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium flex items-center justify-center space-x-2 transition-all"
            >
              <Save className="w-5 h-5" />
              <span>Save Changes</span>
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium flex items-center justify-center transition-all"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default EditBudgetModal;
