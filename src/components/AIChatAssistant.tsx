import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Send,
  Sparkles,
  TrendingUp,
  DollarSign,
  Calendar,
  Loader2
} from 'lucide-react';
import MarkdownText from './MarkdownText';
import { generateAIResponse } from '../services/openai';
import { useAuth } from '../context/AuthContext';
import { useTransactions, useGoals, useBudgets } from '../hooks/useFirestoreSync';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatAssistantProps {
  transactions?: any[];
  budgets?: any[];
  goals?: any[];
  onGoalAdded?: () => void;
  onGoalUpdated?: () => void;
}

const AIChatAssistant = ({ transactions = [], budgets = [], goals = [], onGoalAdded, onGoalUpdated }: AIChatAssistantProps) => {
  const { userProfile, currentUser } = useAuth();
  const { addTransaction, removeTransaction } = useTransactions();
  const { addGoal, updateGoal, removeGoal } = useGoals();
  const { addBudget } = useBudgets();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your financial assistant. Ask me about your expenses, budgets, or get smart saving tips!",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // ... scroll to bottom ...

  const scrollMessagesToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollMessagesToBottom();
  }, [messages, isOpen, isLoading]);

  const handleFunctionCall = async (functionCall: { name: string; arguments: any }) => {
    try {
      if (functionCall.name === 'add_transaction') {
        if (!currentUser) {
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'Please sign in to add transactions.',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, errorMessage]);
          setIsLoading(false);
          return;
        }

        const { type, amount, category, description, paymentMethod } = functionCall.arguments;
        const now = new Date();

        const transaction = {
          id: `tx_${Date.now()}`,
          userId: currentUser.uid,
          type,
          amount,
          category,
          description,
          paymentMethod: paymentMethod || 'Cash',
          date: now,
          createdAt: now,
          updatedAt: now,
        };

        await addTransaction(transaction);

        const successMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `✅ Successfully added ${type} of ₹${amount} for ${description}! Your dashboard has been updated instantly.`,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, successMessage]);
        setIsLoading(false);
        // Auto-close after showing success
        setTimeout(() => {
          setIsOpen(false);
        }, 3000);
      } else if (functionCall.name === 'remove_transaction') {
        const { transactionId } = functionCall.arguments;
        await removeTransaction(transactionId);

        const successMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `✅ Successfully removed the transaction! Your balance has been updated.`,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, successMessage]);
        setIsLoading(false);
      } else if (functionCall.name === 'add_goal') {
        if (!currentUser) {
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'Please sign in to add goals.',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, errorMessage]);
          setIsLoading(false);
          return;
        }

        const { name, targetAmount, currentAmount, deadline } = functionCall.arguments;
        const now = new Date();

        const goal = {
          id: `goal_${Date.now()}`,
          userId: currentUser.uid,
          name,
          targetAmount,
          currentAmount: currentAmount || 0,
          deadline: deadline ? new Date(deadline) : new Date(now.setMonth(now.getMonth() + 3)),
          theme: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await addGoal(goal);
        if (onGoalAdded) onGoalAdded();

        const successMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `✅ Successfully added goal "${name}" with target amount ₹${targetAmount}!`,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, successMessage]);
        setIsLoading(false);
      } else if (functionCall.name === 'update_goal') {
        const { goalId, currentAmount } = functionCall.arguments;
        const existingGoal = goals.find(g => g.id === goalId);

        if (!existingGoal) {
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'Goal not found. Please check the goal ID.',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, errorMessage]);
          setIsLoading(false);
          return;
        }

        await updateGoal({
          ...existingGoal,
          currentAmount,
          updatedAt: new Date()
        });
        if (onGoalUpdated) onGoalUpdated();

        const successMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `✅ Successfully updated goal "${existingGoal.name}"! Current amount: ₹${currentAmount}`,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, successMessage]);
        setIsLoading(false);
      } else if (functionCall.name === 'remove_goal') {
        const { goalId } = functionCall.arguments;
        await removeGoal(goalId);
        if (onGoalUpdated) onGoalUpdated();

        const successMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `✅ Successfully removed the goal!`,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, successMessage]);
        setIsLoading(false);
      } else if (functionCall.name === 'add_budget') {
        if (!currentUser) {
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: 'Please sign in to manage budgets.',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, errorMessage]);
          setIsLoading(false);
          return;
        }

        const { category, amount, period } = functionCall.arguments;
        const now = new Date();
        const budgetPeriod = period || 'monthly';

        // Calculate start and end dates based on period
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);

        const endDate = new Date(startDate);
        if (budgetPeriod === 'weekly') {
          endDate.setDate(endDate.getDate() + 7);
        } else if (budgetPeriod === 'monthly') {
          endDate.setMonth(endDate.getMonth() + 1);
        } else {
          endDate.setFullYear(endDate.getFullYear() + 1);
        }

        const budget = {
          id: `budget_${Date.now()}`,
          userId: currentUser.uid,
          category,
          amount,
          period: budgetPeriod,
          startDate,
          endDate,
          createdAt: now,
        };

        await addBudget(budget);

        const successMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `✅ Successfully set ${period || 'monthly'} budget for ${category} category: ₹${amount}!`,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, successMessage]);
        setIsLoading(false);
      } else if (functionCall.name === 'set_monthly_budget') {
        const { amount } = functionCall.arguments;
        localStorage.setItem('monthly_budget', amount.toString());

        const successMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `✅ Successfully set your monthly budget to ₹${amount}! I'll help you stay on track.`,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, successMessage]);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error executing function call:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error while performing that action. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentQuery = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      // Build conversation history for OpenAI
      const conversationHistory = messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));

      // Call OpenAI service
      const aiResponse = await generateAIResponse(
        currentQuery,
        conversationHistory,
        {
          transactions,
          budgets,
          goals,
          userName: userProfile?.name || userProfile?.email || 'User'
        }
      );

      // Handle function calls if present
      if (aiResponse.functionCall) {
        await handleFunctionCall(aiResponse.functionCall);
        return;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse.message,
        timestamp: new Date()
      };

      setTimeout(() => {
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error('AI response error:', error);
      // Fallback message
      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I'm having trouble connecting right now. Please try again later or ask a different question.",
        timestamp: new Date()
      };
      setTimeout(() => {
        setMessages(prev => [...prev, fallbackMessage]);
        setIsLoading(false);
      }, 500);
    }
  };

  const quickActions = [
    { icon: TrendingUp, label: 'Spending Summary', query: 'What did I spend this month?' },
    { icon: DollarSign, label: 'Budget Tips', query: 'Give me tips to save money' },
    { icon: Calendar, label: 'Monthly Overview', query: 'Show my monthly overview' },
  ];

  const handleQuickAction = (query: string) => {
    setInputMessage(query);
  };

  return (
    <>
      {/* Floating AI Button - keeping existing pulse animation */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-24 right-4 sm:right-6 z-[60] w-12 h-12 bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 rounded-full shadow-2xl flex items-center justify-center group"
          >
            {/* ... existing icon content ... */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 2,
                repeat: Infinity
              }}
              className="absolute inset-0 bg-purple-400 rounded-full opacity-50 blur-lg"
            />
            <Sparkles className="w-6 h-6 text-white relative z-10" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Interface */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile predominantly, but also click-outside desktop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-[1px]"
            />

            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-4 sm:bottom-24 right-2 sm:right-6 z-[101] w-[calc(100vw-1rem)] sm:w-[400px] h-[80vh] sm:h-[600px] max-h-[800px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">AI Assistant</h3>
                    <p className="text-xs text-white/80">Your financial advisor</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-4 ${message.role === 'user'
                        ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                        }`}
                    >
                      {message.role === 'assistant' ? (
                        <MarkdownText
                          content={message.content}
                          className="text-sm leading-relaxed text-gray-700 dark:text-gray-200"
                        />
                      ) : (
                        <p className="text-sm leading-relaxed">{message.content}</p>
                      )}
                      <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
                        }`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </motion.div>
                ))}

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-3 flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">Thinking...</span>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Actions */}
              {messages.length === 1 && (
                <div className="px-4 pb-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Try asking:</p>
                  <div className="flex flex-wrap gap-2">
                    {quickActions.map((action, index) => (
                      <motion.button
                        key={index}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleQuickAction(action.query)}
                        className="flex items-center space-x-1 text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                      >
                        <action.icon className="w-3 h-3" />
                        <span>{action.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask me anything..."
                    className="flex-1 px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isLoading}
                    className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Send className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatAssistant;
