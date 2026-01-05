import { useState, useEffect } from 'react';
import { tieredSyncEngine, type SyncStatus } from '../services/tieredSyncEngine';

export const useSyncStatus = () => {
  const [status, setStatus] = useState<SyncStatus>(tieredSyncEngine.getStatus());
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const unsubscribe = tieredSyncEngine.subscribe((newStatus) => {
      setStatus(newStatus);
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    ...status,
    status: isOnline === false ? 'offline' :
      status.syncing ? 'syncing' :
        status.pending > 0 ? 'pending' : 'synced',
    isOnline,
    totalPending: status.pending
  };
};
