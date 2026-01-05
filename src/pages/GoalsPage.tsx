import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Flag, Plus, Edit } from 'lucide-react';
import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import AddGoalModal from '../components/AddGoalModal';
import UpdateGoalModal from '../components/UpdateGoalModal';
import EditGoalModal from '../components/EditGoalModal';
import { useGoals } from '../hooks/useFirestoreSync';

const GoalsPage = () => {
  const navigate = useNavigate();
  const { goals } = useGoals();
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showUpdateGoal, setShowUpdateGoal] = useState(false);
  const [showEditGoal, setShowEditGoal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);

  const handleUpdateGoal = (goal: any) => {
    setSelectedGoal(goal);
    setShowUpdateGoal(true);
  };

  const handleEditGoal = (goal: any) => {
    setSelectedGoal(goal);
    setShowEditGoal(true);
  };

  const colors = [
    { from: 'from-purple-500', to: 'to-purple-600' },
    { from: 'from-blue-500', to: 'to-blue-600' },
    { from: 'from-teal-500', to: 'to-teal-600' },
    { from: 'from-pink-500', to: 'to-pink-600' },
    { from: 'from-orange-500', to: 'to-orange-600' },
    { from: 'from-green-500', to: 'to-green-600' },
  ];

  return (
    <>
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
          <div className="max-w-md mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Goals</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Track your savings goals</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddGoal(true)}
                className="p-2 rounded-lg bg-blue-500 text-white"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-md mx-auto p-4">
          {goals.length > 0 ? (
            <div className="space-y-3">
              {goals.map((goal: any, index) => {
                const percentage = Math.min(Math.round(((goal.currentAmount || 0) / goal.targetAmount) * 100), 100);
                const color = colors[index % colors.length];
                const remaining = Math.max(goal.targetAmount - (goal.currentAmount || 0), 0);

                return (
                  <motion.div 
                    key={goal.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`bg-gradient-to-r ${color.from} ${color.to} rounded-xl p-4 text-white`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{goal.name}</h3>
                        <p className="text-sm opacity-90">
                          ₹{(goal.currentAmount || 0).toLocaleString()} / ₹{goal.targetAmount.toLocaleString()}
                        </p>
                        {remaining > 0 && (
                          <p className="text-xs opacity-75 mt-1">₹{remaining.toLocaleString()} remaining</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEditGoal(goal)}
                          className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleUpdateGoal(goal)}
                          className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs opacity-90">Progress</span>
                        <span className="text-xs opacity-90">{percentage}%</span>
                      </div>
                      <div className="w-full bg-white/30 rounded-full h-2">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.5 }}
                          className="bg-white rounded-full h-2"
                        />
                      </div>
                    </div>

                    {goal.deadline && (
                      <p className="text-xs opacity-75">
                        Deadline: {new Date(goal.deadline).toLocaleDateString()}
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <Flag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Goals Yet</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Set goals to track your savings
              </p>
              <button 
                onClick={() => setShowAddGoal(true)}
                className="px-6 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
              >
                Create Your First Goal
              </button>
            </motion.div>
          )}
        </div>

        {/* Modals */}
        <AddGoalModal 
          isOpen={showAddGoal} 
          onClose={() => setShowAddGoal(false)}
          onGoalAdded={() => {}}
        />
        <UpdateGoalModal 
          isOpen={showUpdateGoal}
          onClose={() => setShowUpdateGoal(false)}
          goal={selectedGoal}
          onUpdate={() => {}}
        />
        <EditGoalModal 
          isOpen={showEditGoal}
          onClose={() => setShowEditGoal(false)}
          goal={selectedGoal}
          onUpdate={() => {}}
        />
      </div>
    </PageTransition>
  </>
  );
};

export default GoalsPage;
