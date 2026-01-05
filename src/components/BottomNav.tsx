import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Plane, BarChart3, Plus, Target, Flag, List } from 'lucide-react';
import { motion } from 'framer-motion';

interface BottomNavProps {
  onAddClick?: () => void;
}

export const BottomNav = ({ onAddClick }: BottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const handleNavigation = (path: string) => {
    if (location.pathname === path) return;

    // App-like Navigation:
    // 1. Home is the Hub. Navigating TO Home always replaces (so we don't stack Home -> Tab -> Home).
    //    Result: Stack becomes [Home, Home]. Back -> Home. Back -> Exit.
    // 2. Navigating FROM Home to a Tab pushes (so Back goes to Home).
    // 3. Navigating BETWEEN Tabs replaces (so Back goes to Home, not previous tab).

    if (path === '/') {
      navigate('/', { replace: true });
    } else if (location.pathname === '/') {
      navigate(path); // Push only when leaving Home
    } else {
      navigate(path, { replace: true }); // Replace otherwise
    }
  };

  const navButtonClass = (path: string) =>
    `nav-item relative flex flex-col items-center justify-center min-w-0 flex-1 py-2 xs:py-3 transition-all duration-300 group ${isActive(path)
      ? 'text-blue-600 dark:text-blue-400'
      : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
    }`;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-700/50 transition-all duration-300 z-50 shadow-[0_-5px_25px_-5px_rgba(0,0,0,0.1)] dark:shadow-[0_-5px_25px_-5px_rgba(0,0,0,0.5)]"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 4px), 4px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)'
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent opacity-50"></div>
      <div className="w-full max-w-screen-sm mx-auto">
        <div className="flex items-end justify-around pt-0.5 pb-0.5 px-1">
          {/* Home */}
          {/* Home */}
          <button onClick={() => handleNavigation('/')} className={navButtonClass('/')}>
            <div className={`relative p-1 rounded-xl transition-all duration-300 ${isActive('/') ? 'bg-blue-50 dark:bg-blue-900/30 translate-y-[-2px]' : ''}`}>
              <Home className="w-6 h-6 xs:w-7 xs:h-7 flex-shrink-0" strokeWidth={2} />
            </div>
            <span className={`text-[13px] font-medium truncate mt-1 transition-all duration-300 ${isActive('/') ? 'font-bold' : ''}`}>Home</span>
          </button>

          {/* Plans (Group Expenses) */}
          {/* Plans (Group Expenses) */}
          <button onClick={() => handleNavigation('/trips')} className={navButtonClass('/trips')}>
            <div className={`relative p-1 rounded-xl transition-all duration-300 ${isActive('/trips') ? 'bg-blue-50 dark:bg-blue-900/30 translate-y-[-2px]' : ''}`}>
              <Plane className="w-6 h-6 xs:w-7 xs:h-7 flex-shrink-0" strokeWidth={2} />
            </div>
            <span className={`text-[13px] font-medium truncate mt-1 transition-all duration-300 ${isActive('/trips') ? 'font-bold' : ''}`}>Plans</span>
          </button>

          {/* Analytics */}
          {/* Analytics */}
          <button onClick={() => handleNavigation('/analytics')} className={navButtonClass('/analytics')}>
            <div className={`relative p-1 rounded-xl transition-all duration-300 ${isActive('/analytics') ? 'bg-blue-50 dark:bg-blue-900/30 translate-y-[-2px]' : ''}`}>
              <BarChart3 className="w-6 h-6 xs:w-7 xs:h-7 flex-shrink-0" strokeWidth={2} />
            </div>
            <span className={`text-[13px] font-medium truncate mt-1 transition-all duration-300 ${isActive('/analytics') ? 'font-bold' : ''}`}>Stats</span>
          </button>

          {/* Add Button (Center) - Floating */}
          <button
            onClick={onAddClick}
            className="nav-item flex flex-col items-center justify-center min-w-0 flex-1 -mt-8 mb-3"
          >
            <motion.div
              whileTap={{ scale: 0.92 }}
              className="w-12 h-12 xs:w-14 xs:h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 border-4 border-white dark:border-gray-800"
            >
              <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
            </motion.div>
          </button>

          {/* Budgets */}
          {/* Budgets */}
          <button onClick={() => handleNavigation('/budgets')} className={navButtonClass('/budgets')}>
            <div className={`relative p-1 rounded-xl transition-all duration-300 ${isActive('/budgets') ? 'bg-blue-50 dark:bg-blue-900/30 translate-y-[-2px]' : ''}`}>
              <Target className="w-6 h-6 xs:w-7 xs:h-7 flex-shrink-0" strokeWidth={2} />
            </div>
            <span className={`text-[13px] font-medium truncate mt-1 transition-all duration-300 ${isActive('/budgets') ? 'font-bold' : ''}`}>Budget</span>
          </button>

          {/* Goals */}
          {/* Goals */}
          <button onClick={() => handleNavigation('/goals')} className={navButtonClass('/goals')}>
            <div className={`relative p-1 rounded-xl transition-all duration-300 ${isActive('/goals') ? 'bg-blue-50 dark:bg-blue-900/30 translate-y-[-2px]' : ''}`}>
              <Flag className="w-6 h-6 xs:w-7 xs:h-7 flex-shrink-0" strokeWidth={2} />
            </div>
            <span className={`text-[13px] font-medium truncate mt-1 transition-all duration-300 ${isActive('/goals') ? 'font-bold' : ''}`}>Goals</span>
          </button>

          {/* Transactions */}
          {/* Transactions */}
          <button onClick={() => handleNavigation('/transactions')} className={navButtonClass('/transactions')}>
            <div className={`relative p-1 rounded-xl transition-all duration-300 ${isActive('/transactions') ? 'bg-blue-50 dark:bg-blue-900/30 translate-y-[-2px]' : ''}`}>
              <List className="w-6 h-6 xs:w-7 xs:h-7 flex-shrink-0" strokeWidth={2} />
            </div>
            <span className={`text-[13px] font-medium truncate mt-1 transition-all duration-300 ${isActive('/transactions') ? 'font-bold' : ''}`}>History</span>
          </button>
        </div>
      </div>
    </nav>
  );
};
