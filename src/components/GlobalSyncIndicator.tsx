import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

export const GlobalSyncIndicator = () => {
  const { status, totalPending: pendingCount } = useSyncStatus();
  const network = useNetworkStatus();
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    // Show indicator only for syncing, failed, or offline states (not for pending)
    setShowIndicator(status === 'syncing' || status === 'failed' || !network.isOnline);
  }, [status, network.isOnline]);

  if (!showIndicator) return null;

  const getIcon = () => {
    if (!network.isOnline) return <CloudOff className="w-4 h-4" />;
    if (status === 'syncing') return (
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <RefreshCw className="w-4 h-4" />
      </motion.div>
    );
    if (status === 'failed') return <AlertCircle className="w-4 h-4" />;
    return <Cloud className="w-4 h-4" />;
  };

  const getMessage = () => {
    if (!network.isOnline) return 'Offline';
    if (status === 'syncing') return `Syncing ${pendingCount} item${pendingCount !== 1 ? 's' : ''}...`;
    if (status === 'failed') return 'Sync failed - will retry';
    if (status === 'pending') return `${pendingCount} pending`;
    return 'Synced';
  };

  const getColor = () => {
    if (!network.isOnline) return 'bg-gray-500';
    if (status === 'failed') return 'bg-red-500';
    if (status === 'syncing') return 'bg-blue-500';
    if (status === 'pending') return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className={`fixed top-16 right-4 z-[9999] ${getColor()} text-white rounded-full px-3 py-1.5 shadow-lg flex items-center gap-2 text-xs font-medium`}
      >
        {getIcon()}
        <span>{getMessage()}</span>
      </motion.div>
    </AnimatePresence>
  );
};
