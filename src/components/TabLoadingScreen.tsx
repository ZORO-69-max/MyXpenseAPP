import { motion } from 'framer-motion';
import { BarChart3, Target, Flag, Sparkles } from 'lucide-react';

interface TabLoadingScreenProps {
  tab: 'analytics' | 'budgets' | 'goals';
}

const TabLoadingScreen = ({ tab }: TabLoadingScreenProps) => {
  const getIcon = () => {
    switch (tab) {
      case 'analytics':
        return <BarChart3 className="w-16 h-16" />;
      case 'budgets':
        return <Target className="w-16 h-16" />;
      case 'goals':
        return <Flag className="w-16 h-16" />;
    }
  };

  const getTitle = () => {
    switch (tab) {
      case 'analytics':
        return 'Loading Analytics';
      case 'budgets':
        return 'Loading Budgets';
      case 'goals':
        return 'Loading Goals';
    }
  };

  const getGradient = () => {
    switch (tab) {
      case 'analytics':
        return 'from-purple-500 via-blue-500 to-indigo-600';
      case 'budgets':
        return 'from-blue-500 via-teal-500 to-cyan-600';
      case 'goals':
        return 'from-teal-500 via-green-500 to-emerald-600';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.05 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`fixed inset-0 bg-gradient-to-br ${getGradient()} flex flex-col items-center justify-center z-50`}
    >
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-32 h-32 bg-white/5 rounded-full"
            initial={{ 
              x: Math.random() * window.innerWidth, 
              y: window.innerHeight + 100,
              scale: Math.random() * 0.5 + 0.5
            }}
            animate={{
              y: -100,
              x: Math.random() * window.innerWidth,
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.5
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ scale: 0.5, opacity: 0, rotate: -180 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ 
          type: "spring",
          stiffness: 200,
          damping: 20,
          duration: 0.6
        }}
        className="relative z-10"
      >
        <motion.div
          animate={{ 
            rotate: 360,
          }}
          transition={{ 
            rotate: {
              duration: 3,
              repeat: Infinity,
              ease: "linear"
            }
          }}
          className="w-32 h-32 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-2xl border-2 border-white/30 relative overflow-hidden"
        >
          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{
              x: ['-100%', '100%']
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          
          <motion.div 
            className="text-white relative z-10"
            animate={{
              scale: [1, 1.15, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {getIcon()}
          </motion.div>
        </motion.div>

        {/* Pulsing rings */}
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute inset-0 border-2 border-white/30 rounded-3xl"
            animate={{
              scale: [1, 1.4, 1.4],
              opacity: [0.6, 0, 0]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.7,
              ease: "easeOut"
            }}
          />
        ))}
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="mt-12 text-center relative z-10"
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <h3 className="text-white text-2xl font-bold mb-3 flex items-center gap-2 justify-center">
            <Sparkles className="w-5 h-5" />
            {getTitle()}
            <Sparkles className="w-5 h-5" />
          </h3>
        </motion.div>
        
        <div className="flex items-center justify-center gap-2 mt-4">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-3 h-3 bg-white rounded-full shadow-lg"
              animate={{
                scale: [1, 1.8, 1],
                opacity: [0.4, 1, 0.4]
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-white/80 text-sm mt-3"
        >
          Preparing your data...
        </motion.p>
      </motion.div>
    </motion.div>
  );
};

export default TabLoadingScreen;
