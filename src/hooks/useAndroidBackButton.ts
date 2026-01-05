import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const useAndroidBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const historyStackRef = useRef<string[]>([]);
  const isStandaloneRef = useRef(false);

  useEffect(() => {
    // Detect if app is running as PWA/standalone
    isStandaloneRef.current = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    const handleBackButton = (e: PopStateEvent) => {
      const historyStack = historyStackRef.current;
      
      // Only intercept in standalone/PWA mode
      if (!isStandaloneRef.current) {
        return; // Let browser handle normally
      }
      
      // If we have in-app history, navigate back within the app
      if (historyStack.length > 1) {
        e.preventDefault();
        historyStack.pop(); // Remove current page
        const previousPage = historyStack[historyStack.length - 1];
        navigate(previousPage, { replace: true });
        return;
      }
      
      // If we're on home page with no history, prevent exit
      if (location.pathname === '/' && historyStack.length <= 1) {
        e.preventDefault();
        // Push state to prevent exit from home
        window.history.pushState(null, '', '/');
        return;
      }
      
      // For other pages with no history, allow browser to handle
      // (this allows natural exit or return to previous site)
    };

    // Track current page in history
    const currentPath = location.pathname;
    const historyStack = historyStackRef.current;
    
    // Only add if it's different from the last entry
    if (historyStack.length === 0 || historyStack[historyStack.length - 1] !== currentPath) {
      historyStack.push(currentPath);
      // Keep stack size reasonable (max 50 entries)
      if (historyStack.length > 50) {
        historyStack.shift();
      }
    }
    
    window.addEventListener('popstate', handleBackButton);

    return () => {
      window.removeEventListener('popstate', handleBackButton);
    };
  }, [navigate, location]);
};
