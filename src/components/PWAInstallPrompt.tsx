import { useState, useEffect, useCallback } from 'react';
import { X, Download, Smartphone, Zap, Wifi, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallPromptProps {
  forceShow?: boolean;
  onLoginPage?: boolean;
}

const PWAInstallPrompt = ({ forceShow = false, onLoginPage = false }: PWAInstallPromptProps) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       (window.navigator as any).standalone === true;

  const shouldShowPrompt = useCallback(() => {
    if (isStandalone) return false;
    
    // Always show on login page - only respect session dismissal for current page session
    if (onLoginPage) {
      const sessionDismissed = sessionStorage.getItem('pwa_install_dismissed_session');
      return !sessionDismissed;
    }
    
    if (forceShow) {
      return true;
    }
    
    const dismissed = localStorage.getItem('pwa_install_dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed) : 0;
    const daysSinceDismiss = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
    return !dismissed || daysSinceDismiss > 3;
  }, [forceShow, onLoginPage, isStandalone]);

  useEffect(() => {
    if (isStandalone) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const installEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(installEvent);
      
      if (shouldShowPrompt()) {
        setTimeout(() => setShowPrompt(true), 500);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS or when on login page, show the prompt after a short delay
    if (shouldShowPrompt()) {
      setTimeout(() => {
        setShowPrompt(true);
        if (isIOS) {
          setShowIOSInstructions(true);
        }
      }, onLoginPage ? 800 : 1000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [shouldShowPrompt, isIOS, isStandalone, onLoginPage]);

  useEffect(() => {
    if (forceShow && !isStandalone && shouldShowPrompt()) {
      setTimeout(() => setShowPrompt(true), 300);
    }
  }, [forceShow, isStandalone, shouldShowPrompt]);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) return;

    setIsInstalling(true);
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt');
        localStorage.removeItem('pwa_install_dismissed');
        sessionStorage.removeItem('pwa_install_dismissed_session');
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('[PWA] Install error:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    if (onLoginPage) {
      sessionStorage.setItem('pwa_install_dismissed_session', 'true');
    } else {
      localStorage.setItem('pwa_install_dismissed', Date.now().toString());
    }
    setShowPrompt(false);
    setShowIOSInstructions(false);
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={handleDismiss}
      >
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 p-6 text-white">
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-2 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-4">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg"
              >
                <Smartphone className="w-8 h-8 text-blue-500" />
              </motion.div>
              <div>
                <h3 className="text-xl font-bold">Install MyXpense</h3>
                <p className="text-blue-100 text-sm">Get the full app experience</p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {showIOSInstructions ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                  To install on iOS:
                </p>
                <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex items-start space-x-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
                    <span>Tap the <strong>Share</strong> button at the bottom of Safari</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
                    <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
                    <span>Tap <strong>"Add"</strong> to install the app</span>
                  </li>
                </ol>
              </div>
            ) : (
              <ul className="space-y-2.5">
                <li className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Wifi className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Works offline</span>
                </li>
                <li className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Faster loading times</span>
                </li>
                <li className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Home screen access</span>
                </li>
              </ul>
            )}

            <div className="space-y-2 pt-2">
              {!showIOSInstructions && (
                <button
                  onClick={handleInstall}
                  disabled={isInstalling}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold flex items-center justify-center space-x-2 shadow-lg shadow-blue-500/25 transition-all disabled:opacity-70"
                >
                  {isInstalling ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      <span>Install Now</span>
                    </>
                  )}
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="w-full py-3 px-4 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm font-medium transition-colors rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50"
              >
                {showIOSInstructions ? "Got it" : "Maybe Later"}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PWAInstallPrompt;
