import { motion } from 'framer-motion';

export const TransactionSkeleton = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white dark:bg-gray-800 rounded-2xl p-3 sm:p-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 sm:w-32 mb-2 animate-pulse" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 sm:w-20 animate-pulse" />
          </div>
        </div>
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16 sm:w-20 animate-pulse" />
      </div>
    </motion.div>
  );
};

export const GoalSkeleton = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white dark:bg-gray-800 rounded-2xl p-3 sm:p-4 shadow-sm"
    >
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="h-4 sm:h-5 bg-gray-200 dark:bg-gray-700 rounded w-24 sm:w-32 animate-pulse" />
        <div className="h-4 sm:h-5 bg-gray-200 dark:bg-gray-700 rounded w-16 sm:w-20 animate-pulse" />
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse mb-2" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 sm:w-24 animate-pulse" />
    </motion.div>
  );
};

export const DashboardCardSkeleton = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white dark:bg-gray-800 rounded-2xl p-3 sm:p-4 shadow-sm"
    >
      <div className="h-3 sm:h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 sm:w-24 mb-2 sm:mb-3 animate-pulse" />
      <div className="h-6 sm:h-8 bg-gray-200 dark:bg-gray-700 rounded w-24 sm:w-32 animate-pulse" />
    </motion.div>
  );
};
