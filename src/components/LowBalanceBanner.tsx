import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface LowBalanceBannerProps {
  balance: number;
  threshold: number;
}

const LowBalanceBanner = ({ balance, threshold }: LowBalanceBannerProps) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (balance >= threshold || isDismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mx-4 mb-4"
      >
        <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm sm:text-base mb-1">Low Balance Alert!</h4>
              <p className="text-xs sm:text-sm opacity-90">
                Your balance is ₹{balance.toLocaleString()}. Consider adding income or reducing expenses to stay on track.
              </p>
            </div>
            <button
              onClick={() => setIsDismissed(true)}
              className="w-6 h-6 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LowBalanceBanner;
