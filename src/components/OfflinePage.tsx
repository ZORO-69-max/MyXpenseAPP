import { WifiOff, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

const OfflinePage = () => {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 max-w-md border border-white/20">
          <motion.div
            animate={{ 
              rotate: [0, -10, 10, -10, 0],
            }}
            transition={{ 
              duration: 0.5,
              repeat: Infinity,
              repeatDelay: 2 
            }}
            className="inline-block"
          >
            <WifiOff className="w-20 h-20 text-blue-300 mx-auto mb-6" />
          </motion.div>
          
          <h1 className="text-3xl font-bold text-white mb-4">Internet Required</h1>
          <p className="text-blue-200 mb-6">
            Please connect to the internet to use MyXpense. Your data is safe and will sync once you're back online.
          </p>
          
          <button
            onClick={handleRefresh}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default OfflinePage;
