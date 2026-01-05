import { useState, useEffect } from 'react';
import { logger } from '../utils/logger';

interface NetworkStatus {
  isOnline: boolean;
  isSlow: boolean;
  effectiveType?: string;
}

export const useNetworkStatus = () => {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isSlow: false,
    effectiveType: undefined
  });

  useEffect(() => {
    const updateOnlineStatus = () => {
      const isOnline = navigator.onLine;
      logger.debug('Network status changed:', isOnline ? 'online' : 'offline');
      
      setStatus(prev => ({
        ...prev,
        isOnline
      }));
    };

    const updateConnectionType = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      
      if (connection) {
        const effectiveType = connection.effectiveType;
        const isSlow = effectiveType === 'slow-2g' || effectiveType === '2g';
        
        logger.debug('Connection type:', effectiveType);
        
        setStatus(prev => ({
          ...prev,
          isSlow,
          effectiveType
        }));
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (connection) {
      connection.addEventListener('change', updateConnectionType);
      updateConnectionType();
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      
      if (connection) {
        connection.removeEventListener('change', updateConnectionType);
      }
    };
  }, []);

  return status;
};
