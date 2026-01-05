import { useState } from 'react';
import { Wallet, Edit2, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface MonthlyBudgetCardProps {
  totalBudget: number;
  totalSpent: number;
  onUpdateBudget: (newBudget: number) => void;
}

const MonthlyBudgetCard = ({ totalBudget, totalSpent, onUpdateBudget }: MonthlyBudgetCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(totalBudget.toString());

  const percentage = totalBudget > 0 ? Math.min(Math.round((totalSpent / totalBudget) * 100), 100) : 0;
  const remaining = Math.max(totalBudget - totalSpent, 0);
  const isOverBudget = totalSpent > totalBudget;

  const handleSave = () => {
    const newBudget = parseFloat(editValue);
    if (!isNaN(newBudget) && newBudget >= 0) {
      onUpdateBudget(newBudget);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditValue(totalBudget.toString());
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-6 text-white ${
        isOverBudget
          ? 'bg-gradient-to-br from-red-500 to-red-600'
          : 'bg-gradient-to-br from-blue-500 to-indigo-600'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-medium opacity-90">Monthly Budget</h3>
            <p className="text-xs opacity-75">This month's spending limit</p>
          </div>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/80">
                ₹
              </span>
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                autoFocus
              />
            </div>
            <button
              onClick={handleSave}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <Check className="w-5 h-5" />
            </button>
            <button
              onClick={handleCancel}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <div className="text-4xl font-bold mb-1">₹{totalBudget.toLocaleString()}</div>
          <div className="text-sm opacity-90">
            ₹{totalSpent.toLocaleString()} spent • ₹{remaining.toLocaleString()} remaining
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="opacity-90">Budget Usage</span>
          <span className="font-semibold">{percentage}%</span>
        </div>
        <div className="w-full bg-white/30 rounded-full h-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-full h-3"
          />
        </div>
      </div>

      {isOverBudget && (
        <div className="mt-4 bg-white/20 rounded-lg p-3">
          <p className="text-sm font-medium">⚠️ You've exceeded your monthly budget!</p>
        </div>
      )}
    </motion.div>
  );
};

export default MonthlyBudgetCard;
