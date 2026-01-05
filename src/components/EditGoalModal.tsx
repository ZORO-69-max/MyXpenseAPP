import { useState, useEffect } from 'react';
import { X, Save, Trash2, Link as LinkIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useGoals } from '../hooks/useFirestoreSync';

interface EditGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: any;
  onUpdate: () => void;
}

const EditGoalModal = ({ isOpen, onClose, goal, onUpdate }: EditGoalModalProps) => {
  const { updateGoal, removeGoal } = useGoals();
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [productLink, setProductLink] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (goal) {
      setGoalName(goal.name || '');
      setTargetAmount(goal.targetAmount?.toString() || '');
      setCurrentAmount(goal.currentAmount?.toString() || '0');
      setDeadline(goal.deadline || '');
      setProductLink(goal.productLink || '');
      setShowDeleteConfirm(false);
      setIsDeleting(false);
      setIsUpdating(false);
    }
  }, [goal]);

  if (!isOpen || !goal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isUpdating) return;
    
    setIsUpdating(true);
    try {
      await updateGoal({
        ...goal,
        name: goalName,
        targetAmount: parseFloat(targetAmount),
        currentAmount: parseFloat(currentAmount) || 0,
        deadline: deadline ? new Date(deadline) : goal.deadline,
        updatedAt: new Date(),
      });
      
      setIsUpdating(false);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating goal:', error);
      setIsUpdating(false);
      alert('Failed to update goal. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    try {
      // Delete goal (optimistic update happens in hook)
      await removeGoal(goal.id);
      
      // Close immediately - no delay needed with optimistic updates
      setShowDeleteConfirm(false);
      setIsDeleting(false);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('[EditGoalModal] Error deleting goal:', error);
      setIsDeleting(false);
      alert('Failed to delete goal. Please try again.');
    }
  };

  const handleClose = () => {
    if (!isDeleting && !isUpdating) {
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
    >
      <div 
        className="fixed inset-0 bg-black/50" 
        onClick={handleClose}
      ></div>
      <motion.div 
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Goal</h2>
          <button 
            onClick={handleClose} 
            disabled={isDeleting || isUpdating}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {!showDeleteConfirm ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Goal Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Goal Name *
              </label>
              <input
                type="text"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Headphones, Vacation"
                required
                disabled={isUpdating}
              />
            </div>

            {/* Target Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Amount *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">₹</span>
                <input
                  type="number"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter target amount"
                  required
                  disabled={isUpdating}
                />
              </div>
            </div>

            {/* Current Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Amount
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">₹</span>
                <input
                  type="number"
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter current saved amount"
                  disabled={isUpdating}
                />
              </div>
            </div>

            {/* Product Link */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Product Link (Optional)
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="url"
                  value={productLink}
                  onChange={(e) => setProductLink(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/product"
                  disabled={isUpdating}
                />
              </div>
              {productLink && (
                <a 
                  href={productLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline mt-1 inline-block"
                >
                  View product →
                </a>
              )}
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Deadline (Optional)
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isUpdating}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isUpdating}
                className="flex-1 py-3 px-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-medium flex items-center justify-center space-x-2 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5" />
                <span>Delete</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={isUpdating}
                className="flex-1 py-3 px-4 bg-blue-500 text-white rounded-xl font-medium flex items-center justify-center space-x-2 hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5" />
                <span>{isUpdating ? 'Saving...' : 'Save Changes'}</span>
              </motion.button>
            </div>
          </form>
        ) : (
          <div className="p-6 space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Delete Goal?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Are you sure you want to delete "{goalName}"? This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <Trash2 className="w-5 h-5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Goal'}</span>
              </motion.button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default EditGoalModal;
