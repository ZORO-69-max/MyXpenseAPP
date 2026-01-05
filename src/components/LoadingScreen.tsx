import { motion } from 'framer-motion';
import { Wallet, Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  showSpinner?: boolean;
}

const LoadingScreen = ({
  message = 'Loading...',
  showSpinner = true
}: LoadingScreenProps) => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center z-50">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0, rotate: 0 }}
          animate={{ scale: 1, rotate: 360 }}
          transition={{
            duration: 0.4,
            type: 'spring',
            stiffness: 300,
            damping: 25
          }}
          className="bg-white/10 backdrop-blur-sm w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl border border-white/20"
        >
          <Wallet className="w-10 h-10 text-white" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="text-2xl font-bold text-white mb-2"
        >
          MyXpense
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="text-blue-100 mb-4 text-sm"
        >
          {message}
        </motion.p>

        {showSpinner && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            className="inline-block"
          >
            <Loader2 className="w-6 h-6 text-white" />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default LoadingScreen;
