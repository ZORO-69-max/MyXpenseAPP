import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Lightbulb, RefreshCw, ChevronRight, TrendingDown, Target, AlertTriangle, PiggyBank } from 'lucide-react';
import { generateAIResponse } from '../services/openai';
import { insightGenerator } from '../utils/insightGenerator';
import { useAuth } from '../context/AuthContext';

const AIInsightsCard = ({ compact = false, transactions = [], budgets = [], goals = [] }: { compact?: boolean, transactions?: any[], budgets?: any[], goals?: any[] }) => {
  const { userProfile } = useAuth();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0);

  // Deep Analysis Logic
  const [isDeepAnalysisOpen, setIsDeepAnalysisOpen] = useState(false);
  const [deepAnalysisContent, setDeepAnalysisContent] = useState<string>('');
  const [isDeepAnalysisLoading, setIsDeepAnalysisLoading] = useState(false);

  const fetchDeepAnalysis = async () => {
    if (deepAnalysisContent) return;

    setIsDeepAnalysisLoading(true);
    try {
      const context = {
        userName: (userProfile as any)?.displayName || 'User',
        transactions,
        budgets,
        goals
      };

      const response = await generateAIResponse(
        "Generate a comprehensive financial deep analysis report for me. Structure it with 3 sections: 1. 🔍 Spending Habits & Anomalies, 2. 📉 Budgeting Improvements, 3. 🎯 Savings Strategy. Use bullet points and be very specific based on my data. Use formatting like **bold** for key terms.",
        [],
        context
      );

      setDeepAnalysisContent(response.message);
    } catch (err) {
      setDeepAnalysisContent("Unable to generate deep analysis at this time. Please try again later.");
    } finally {
      setIsDeepAnalysisLoading(false);
    }
  };

  const handleDeepAnalysisClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeepAnalysisOpen(true);
    fetchDeepAnalysis();
  };

  // Synchronous Insight Generation (Memoized to prevent flickering)
  const insights = useMemo(() => {
    if ((compact && !isExpanded) || transactions.length === 0) return [];

    try {
      const context = {
        userName: (userProfile as any)?.displayName || 'User',
        transactions,
        budgets,
        goals
      };

      // Generate 3 unique insights
      const generatedInsights = [];
      const usedTypes = new Set<string>();
      const usedMessages = new Set<string>();
      let attempts = 0;

      while (generatedInsights.length < 3 && attempts < 10) {
        attempts++;
        const insight = insightGenerator.getInsight(context);

        // Check uniqueness
        if (!usedTypes.has(insight.type) && !usedMessages.has(insight.message)) {
          generatedInsights.push(insight);
          usedTypes.add(insight.type);
          usedMessages.add(insight.message);
        }
      }
      return generatedInsights;
    } catch (err) {
      console.error("Failed to generate insight:", err);
      return [
        { message: "Try tracking more expenses to unlock personalized AI tips!", type: 'general', icon: '💡', priority: 1 }
      ];
    }
    // Optimization: Only re-generate insights if transaction count changes, or manual refresh.
    // Deep equal check on transactions is too expensive. Reference check is too volatile.
    // relying on length + refreshTrigger is a good balance for stability vs freshness.
    // budgets/goals/userProfile loading later causes flickering if included here, so we omit them 
    // to prioritize stability. Manual refresh captures them if needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions.length, refreshTrigger, compact, isExpanded]);

  // Initial load check for empty state
  // Actually, wait. If transactions are empty because they are loading from Firebase, do we show skeleton?
  // In Dashboard logic, isLoading comes from useTransactions. Here it's passed as prop.
  // The props 'transactions' are likely empty initially. 
  // Let's rely on parent's loading state if we want to show skeleton?
  // Current implementation didn't take a Loading prop.
  // We will assume if transactions are empty, we might show a fallback or just empty.
  // But previously `isLoading` was initialized to `true`.

  // Controlled Loading State (Simulates AI "Thinking" for valid UX, but stable)
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Show skeleton loading on mount and when manually refreshed
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500); // 1.5s "Generating" animation
    return () => clearTimeout(timer);
  }, [refreshTrigger]); // Only re-load on mount or manual refresh, not on small data changes

  // Auto-rotate insights in compact mode
  useEffect(() => {
    if (compact && !isExpanded && insights.length > 1) {
      const interval = setInterval(() => {
        setCurrentInsightIndex((prev) => (prev + 1) % insights.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [compact, isExpanded, insights.length]);

  const getGradientForType = (type: string) => {
    switch (type) {
      case 'budget':
      case 'spending':
        return 'from-blue-500 via-indigo-500 to-purple-600';
      case 'savings':
      case 'goal':
        return 'from-green-500 via-emerald-500 to-teal-600';
      case 'debt':
        return 'from-orange-500 via-red-500 to-pink-600';
      default:
        return 'from-blue-500 via-purple-500 to-pink-500';
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'budget':
        return Target;
      case 'spending':
        return TrendingDown;
      case 'savings':
        return PiggyBank;
      case 'goal':
        return Sparkles;
      case 'debt':
        return AlertTriangle;
      default:
        return Lightbulb;
    }
  };

  // Render compact button trigger
  if (compact && !isExpanded) {
    const currentInsight = insights[currentInsightIndex];
    if (!currentInsight) {
      return (
        <motion.button
          layout
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-full shadow-md border border-indigo-100 dark:border-indigo-900/30"
        >
          <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full text-white shadow-sm">
            <Sparkles className="w-3 h-3" />
          </div>
          <span className="text-xs font-bold text-gray-800 dark:text-gray-200">AI Insights</span>
        </motion.button>
      );
    }

    const Icon = getIconForType(currentInsight.type);
    return (
      <motion.button
        key={currentInsightIndex}
        layout
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsExpanded(true)}
        className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${getGradientForType(currentInsight.type)} rounded-full shadow-md`}
      >
        <Icon className="w-3 h-3 text-white" />
        <span className="text-xs font-bold text-white line-clamp-1">{currentInsight.message.slice(0, 30)}...</span>
      </motion.button>
    );
  }

  const InsightCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 min-h-[120px]">
      <AnimatePresence mode="popLayout">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <motion.div
              key={`skeleton-${idx}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl p-3 border border-gray-200 dark:border-gray-700 shadow-sm animate-pulse"
            >
              {/* Header Row: Icon + Badge */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              </div>
              {/* Body Text */}
              <div className="space-y-1.5">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              </div>
            </motion.div>
          ))
        ) : (
          insights.map((insight: any, idx: number) => {
            const Icon = getIconForType(insight.type);
            const gradient = getGradientForType(insight.type);

            return (
              <motion.div
                key={`insight-${idx}-${insight.type}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className={`relative overflow-hidden bg-gradient-to-br ${gradient} rounded-xl p-3 text-white shadow-md hover:shadow-lg transition-all`}
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2"></div>

                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wide bg-white/20 px-1.5 py-0.5 rounded-full">
                      {insight.type}
                    </span>
                  </div>

                  <p className="text-xs font-medium leading-snug line-clamp-2">
                    {insight.message}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
      </AnimatePresence>
    </div>
  );

  // If NOT compact, render inline cards
  if (!compact) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-[13px]">AI Insights</h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">Powered by Smart Analysis</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setRefreshTrigger(prev => prev + 1);
              }}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={handleDeepAnalysisClick}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:gap-2 transition-all bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg"
            >
              Deep Analysis <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        <InsightCards />
      </div>
    );
  }

  // Render Full Modal Popup via Portal (when compact=true and expanded=true)
  return createPortal(
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          key="ai-insight-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
          onClick={() => setIsExpanded(false)}
        >
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-[13px]">AI Insights</h3>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Powered by Smart Analysis</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setRefreshTrigger(prev => prev + 1);
                  }}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <RefreshCw className="w-4 h-4 text-gray-500" />
                </button>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-gray-400 rotate-90" />
                </button>
              </div>
            </div>

            <InsightCards />

            <div className="mt-6 flex justify-center">
              <button
                onClick={handleDeepAnalysisClick}
                className="text-sm font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2 hover:gap-3 transition-all bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-xl"
              >
                View Deep Analysis <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Deep Analysis Full Screen Modal */}
      {isDeepAnalysisOpen && (
        <motion.div
          key="deep-analysis-modal"
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed inset-0 bg-white dark:bg-gray-950 z-[10000] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Deep Financial Analysis</h2>
                <p className="text-xs text-gray-500">Powered by Gemini AI</p>
              </div>
            </div>
            <button
              onClick={() => setIsDeepAnalysisOpen(false)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <ChevronRight className="w-6 h-6 rotate-90 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isDeepAnalysisLoading ? (
              <div className="space-y-6 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
                <div className="space-y-3">
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full"></div>
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-5/6"></div>
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-4/6"></div>
                </div>
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
                <div className="space-y-3">
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full"></div>
                  <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-5/6"></div>
                </div>
              </div>
            ) : (
              <div className="prose dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
                  {deepAnalysisContent}
                </div>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950">
            <button
              onClick={() => setIsDeepAnalysisOpen(false)}
              className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl active:scale-[0.98] transition-transform"
            >
              Close Analysis
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default AIInsightsCard;
