import { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGoals } from '../hooks/useFirestoreSync';

interface UpdateGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: any;
  onUpdate: () => void;
}

const UpdateGoalModal = ({ isOpen, onClose, goal, onUpdate }: UpdateGoalModalProps) => {
  const { updateGoal } = useGoals();
  const [amount, setAmount] = useState('');
  const [action, setAction] = useState<'add' | 'remove'>('add');

  if (!isOpen || !goal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amountValue = parseFloat(amount);
    if (!amountValue || amountValue <= 0) return;

    try {
      const currentAmount = goal.currentAmount || 0;
      const newAmount = action === 'add'
        ? currentAmount + amountValue
        : Math.max(0, currentAmount - amountValue);
      
      await updateGoal({ ...goal, currentAmount: newAmount });
      
      setAmount('');
      onClose();
      onUpdate();
    } catch (error) {
      console.error('Error updating goal:', error);
    }
  };

  const percentage = Math.min(Math.round(((goal.currentAmount || 0) / goal.targetAmount) * 100), 100);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
    >
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      <motion.div 
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md"
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Update Goal</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Goal Info */}
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl p-4 text-white">
            <h3 className="font-semibold text-lg mb-2">{goal.name}</h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm opacity-90">₹{(goal.currentAmount || 0).toLocaleString()} / ₹{goal.targetAmount.toLocaleString()}</span>
              <span className="text-sm opacity-90">{percentage}%</span>
            </div>
            <div className="w-full bg-white/30 rounded-full h-2">
              <div 
                className="bg-white rounded-full h-2 transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Action Toggle */}
          <div className="flex space-x-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setAction('add')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center space-x-2 transition-colors ${
                action === 'add'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              <Plus className="w-5 h-5" />
              <span>Add Money</span>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setAction('remove')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center space-x-2 transition-colors ${
                action === 'remove'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              <Minus className="w-5 h-5" />
              <span>Remove Money</span>
            </motion.button>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter amount"
                step="0.01"
                min="0"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            className={`w-full py-4 rounded-xl font-semibold text-lg text-white transition-colors ${
              action === 'add' 
                ? 'bg-green-500 hover:bg-green-600' 
                : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {action === 'add' ? 'Add to Goal' : 'Remove from Goal'}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default UpdateGoalModal;
