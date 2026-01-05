import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';
import { useSyncStatus } from '../hooks/useSyncStatus';

interface SyncStatusIndicatorProps {
    compact?: boolean;
}

const SyncStatusIndicator = ({ compact = false }: SyncStatusIndicatorProps) => {
    const { totalPending, syncing, isOnline } = useSyncStatus();

    // Don't show anything if online and synced
    if (isOnline && totalPending === 0 && !syncing) return null;

    // Compact mode - shows as a small icon badge
    if (compact) {
        return (
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full flex items-center justify-center shadow-md z-20"
                    style={{
                        backgroundColor: !isOnline ? '#6B7280' : syncing ? '#3B82F6' : totalPending > 0 ? '#F59E0B' : 'transparent'
                    }}
                >
                    {!isOnline ? (
                        <CloudOff className="w-2.5 h-2.5 text-white" />
                    ) : syncing ? (
                        <RefreshCw className="w-2.5 h-2.5 text-white animate-spin" />
                    ) : totalPending > 0 ? (
                        <Cloud className="w-2.5 h-2.5 text-white" />
                    ) : null}
                </motion.div>
            </AnimatePresence>
        );
    }

    // Original floating mode (kept for backward compatibility but not used)
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg border border-gray-200 dark:border-gray-700"
            >
                {!isOnline ? (
                    <>
                        <CloudOff className="w-4 h-4 text-gray-500" />
                        <span className="text-xs font-medium text-gray-500">Offline</span>
                    </>
                ) : syncing ? (
                    <>
                        <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                        <span className="text-xs font-medium text-blue-500">Syncing...</span>
                    </>
                ) : totalPending > 0 ? (
                    <>
                        <Cloud className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-medium text-amber-500">{totalPending} Pending</span>
                    </>
                ) : null}

                {/* Warning Indicator if pending persists too long */}
                {totalPending > 5 && (
                    <AlertCircle className="w-4 h-4 text-red-500 ml-1" />
                )}
            </motion.div>
        </AnimatePresence>
    );
};

export default SyncStatusIndicator;
