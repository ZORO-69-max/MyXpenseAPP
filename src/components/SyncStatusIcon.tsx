import { Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export type SyncStatus = 'synced' | 'syncing' | 'pending' | 'failed' | 'offline';

interface SyncStatusIconProps {
  status: SyncStatus;
  size?: number;
  showTooltip?: boolean;
}

export const SyncStatusIcon = ({ status, size = 14, showTooltip = true }: SyncStatusIconProps) => {
  const icons = {
    synced: <CheckCircle className="text-green-500" size={size} />,
    syncing: (
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <RefreshCw className="text-blue-500" size={size} />
      </motion.div>
    ),
    pending: (
      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Cloud className="text-gray-400" size={size} />
      </motion.div>
    ),
    failed: <AlertCircle className="text-red-500" size={size} />,
    offline: <CloudOff className="text-gray-400" size={size} />
  };

  const tooltips = {
    synced: 'Backed up to cloud',
    syncing: 'Syncing...',
    pending: 'Waiting to sync',
    failed: 'Sync failed - will retry',
    offline: 'Offline - will sync when online'
  };

  return (
    <div className="relative inline-flex items-center">
      {icons[status]}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
          {tooltips[status]}
        </div>
      )}
    </div>
  );
};
