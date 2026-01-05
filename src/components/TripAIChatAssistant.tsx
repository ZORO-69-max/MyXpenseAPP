import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Loader2, Bot, Check, X, Plus, ArrowRightLeft } from 'lucide-react';
import MarkdownText from './MarkdownText';
import { generateAIResponse } from '../services/openai';
import { calculateSettlements, generateShareText } from '../utils/minCashFlow';
import type { Trip, TripExpense } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  action?: ParsedAction;
}

interface ParsedAction {
  type: 'add_expense' | 'add_transfer' | 'show_settlement' | 'share_summary';
  data?: {
    title?: string;
    amount?: number;
    category?: string;
    paidBy?: string;
    splitType?: 'equally' | 'onlyMe';
    from?: string;
    to?: string;
  };
  executed?: boolean;
}

interface TripAIChatAssistantProps {
  trip: Trip;
  expenses: TripExpense[];
  onAddExpense?: (expense: TripExpense) => void;
}

// Simple intent parser for common actions
function parseUserIntent(message: string, participants: { id: string; name: string; isCurrentUser?: boolean }[]): ParsedAction | null {
  const lowerMessage = message.toLowerCase();

  // Add expense patterns
  const addExpensePatterns = [
    /add\s+(?:an?\s+)?expense\s+(?:of\s+)?(?:rs\.?|₹)?\s*(\d+(?:\.\d{2})?)\s+(?:for\s+)?(.+)/i,
    /(?:spent|paid)\s+(?:rs\.?|₹)?\s*(\d+(?:\.\d{2})?)\s+(?:on|for)\s+(.+)/i,
    /add\s+(.+?)\s+(?:expense\s+)?(?:of\s+)?(?:rs\.?|₹)?\s*(\d+(?:\.\d{2})?)/i,
    /(.+?)\s+(?:rs\.?|₹)?\s*(\d+(?:\.\d{2})?)\s+(?:expense|paid)/i,
  ];

  // Add transfer patterns
  const transferPatterns = [
    /(?:(\w+)\s+)?(?:paid|transferred|sent|gave)\s+(?:rs\.?|₹)?\s*(\d+(?:\.\d{2})?)\s+to\s+(\w+)/i,
    /transfer\s+(?:rs\.?|₹)?\s*(\d+(?:\.\d{2})?)\s+(?:from\s+)?(\w+)\s+to\s+(\w+)/i,
    /record\s+(?:a\s+)?transfer\s+(?:of\s+)?(?:rs\.?|₹)?\s*(\d+(?:\.\d{2})?)\s+(?:from\s+)?(\w+)\s+to\s+(\w+)/i,
  ];

  // Check for transfer intent
  for (const pattern of transferPatterns) {
    const match = message.match(pattern);
    if (match) {
      const amount = parseFloat(match[2] || match[1]);
      const fromName = (match[1] || match[2] || '').toLowerCase();
      const toName = (match[3] || '').toLowerCase();

      const fromParticipant = participants.find(p =>
        p.name.toLowerCase().includes(fromName) || fromName.includes(p.name.toLowerCase()) ||
        (fromName === 'i' || fromName === 'me') && p.isCurrentUser
      );
      const toParticipant = participants.find(p =>
        p.name.toLowerCase().includes(toName) || toName.includes(p.name.toLowerCase())
      );

      if (amount && fromParticipant && toParticipant) {
        return {
          type: 'add_transfer',
          data: {
            amount,
            from: fromParticipant.id,
            to: toParticipant.id,
            title: `Transfer to ${toParticipant.name}`
          }
        };
      }
    }
  }

  // Check for add expense intent  
  for (const pattern of addExpensePatterns) {
    const match = message.match(pattern);
    if (match) {
      let amount: number;
      let title: string;

      // Different patterns have amount and title in different positions
      if (match[1] && !isNaN(parseFloat(match[1]))) {
        amount = parseFloat(match[1]);
        title = match[2]?.trim() || 'Expense';
      } else {
        amount = parseFloat(match[2]);
        title = match[1]?.trim() || 'Expense';
      }

      if (!isNaN(amount) && amount > 0) {
        // Detect category from title
        const category = detectCategory(title);
        const currentUser = participants.find(p => p.isCurrentUser);

        return {
          type: 'add_expense',
          data: {
            title: capitalizeFirst(title),
            amount,
            category,
            paidBy: currentUser?.id,
            splitType: 'equally'
          }
        };
      }
    }
  }

  // Check for settlement query
  if (lowerMessage.includes('settle') || lowerMessage.includes('who owes') || lowerMessage.includes('settlement')) {
    return { type: 'show_settlement' };
  }

  // Check for share/summary
  if (lowerMessage.includes('share') && (lowerMessage.includes('summary') || lowerMessage.includes('trip'))) {
    return { type: 'share_summary' };
  }

  return null;
}

function detectCategory(title: string): string {
  const lowerTitle = title.toLowerCase();
  const categoryMap: Record<string, string[]> = {
    'food': ['food', 'dinner', 'lunch', 'breakfast', 'snack', 'restaurant', 'cafe', 'tea', 'coffee', 'meal', 'eat'],
    'transport': ['cab', 'uber', 'ola', 'taxi', 'auto', 'bus', 'train', 'metro', 'petrol', 'fuel', 'parking', 'toll'],
    'accommodation': ['hotel', 'stay', 'room', 'hostel', 'airbnb', 'lodge', 'resort'],
    'activities': ['ticket', 'entry', 'museum', 'park', 'tour', 'adventure', 'trekking', 'game'],
    'shopping': ['shop', 'souvenir', 'gift', 'clothes', 'buy', 'purchase', 'market'],
  };

  for (const [category, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(kw => lowerTitle.includes(kw))) {
      return category;
    }
  }
  return 'other';
}

function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const TripAIChatAssistant = ({ trip, expenses, onAddExpense }: TripAIChatAssistantProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `👋 Hi! Try:\n• "Add ₹500 for dinner"\n• "Who owes whom?"\n• "Share summary"`,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ messageId: string; action: ParsedAction } | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setTimeout(() => scrollToBottom(), 0);
  }, []);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const executeAction = (action: ParsedAction) => {
    if (!onAddExpense || !action.data) return;

    const currentUser = trip.participants.find(p => p.isCurrentUser);

    if (action.type === 'add_expense' && action.data.amount && action.data.title) {
      const perPerson = action.data.amount / trip.participants.length;

      const expense: TripExpense = {
        id: `expense_${Date.now()}`,
        tripId: trip.id,
        userId: currentUser?.id || '',
        type: 'expense',
        title: action.data.title,
        amount: action.data.amount,
        category: action.data.category || 'other',
        icon: '',
        date: new Date(),
        paidBy: action.data.paidBy || currentUser?.id,
        split: trip.participants.map(p => ({
          participantId: p.id,
          amount: parseFloat(perPerson.toFixed(2))
        })),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      onAddExpense(expense);
      return true;
    }

    if (action.type === 'add_transfer' && action.data.amount && action.data.from && action.data.to) {
      const fromP = trip.participants.find(p => p.id === action.data!.from);
      const toP = trip.participants.find(p => p.id === action.data!.to);

      const transfer: TripExpense = {
        id: `expense_${Date.now()}`,
        tripId: trip.id,
        userId: currentUser?.id || '',
        type: 'transfer',
        title: `Transfer from ${fromP?.name || 'Unknown'} to ${toP?.name || 'Unknown'}`,
        amount: action.data.amount,
        category: 'settlement',
        icon: '',
        date: new Date(),
        from: action.data.from,
        transferredTo: action.data.to,
        split: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      onAddExpense(transfer);
      return true;
    }

    return false;
  };

  const handleConfirmAction = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message?.action) return;

    const success = executeAction(message.action);

    if (success) {
      // Update the message to show action was executed
      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, action: { ...m.action!, executed: true } }
          : m
      ));

      // Add confirmation message
      const confirmMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: message.action.type === 'add_expense'
          ? `✅ Added **${message.action.data?.title}** expense of ₹${message.action.data?.amount?.toFixed(2)}`
          : `✅ Recorded transfer of ₹${message.action.data?.amount?.toFixed(2)}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, confirmMsg]);
    }

    setPendingAction(null);
  };

  const handleRejectAction = (messageId: string) => {
    setMessages(prev => prev.map(m =>
      m.id === messageId
        ? { ...m, action: undefined }
        : m
    ));

    const cancelMsg: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: 'No problem! Let me know if you want to try again or need something else.',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, cancelMsg]);
    setPendingAction(null);
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
    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      // First check for actionable intent
      const action = parseUserIntent(currentInput, trip.participants);

      if (action && onAddExpense) {
        // Handle action-based response
        let responseContent = '';

        if (action.type === 'add_expense' && action.data) {
          const payer = trip.participants.find(p => p.id === action.data!.paidBy);
          responseContent = `I'll add this expense for you:\n\n` +
            `📝 **${action.data.title}**\n` +
            `💰 Amount: ₹${action.data.amount?.toFixed(2)}\n` +
            `🏷️ Category: ${action.data.category}\n` +
            `👤 Paid by: ${payer?.name || 'You'}\n` +
            `📊 Split: Equally among all\n\n` +
            `Does this look correct?`;
        } else if (action.type === 'add_transfer' && action.data) {
          const fromP = trip.participants.find(p => p.id === action.data!.from);
          const toP = trip.participants.find(p => p.id === action.data!.to);
          responseContent = `I'll record this transfer:\n\n` +
            `🔄 **Transfer**\n` +
            `💰 Amount: ₹${action.data.amount?.toFixed(2)}\n` +
            `👤 From: ${fromP?.name}\n` +
            `👤 To: ${toP?.name}\n\n` +
            `Should I add this?`;
        } else if (action.type === 'show_settlement') {
          // Calculate and show settlement
          const { settlements } = calculateSettlements(trip, expenses);

          if (settlements.length === 0) {
            responseContent = '✅ **All settled!** No pending settlements needed.';
          } else {
            responseContent = '💰 **Settlement Plan** (minimum transactions)\n\n';
            settlements.forEach((s, i) => {
              responseContent += `${i + 1}. **${s.from.name}** → **${s.to.name}**: ₹${s.amount.toFixed(2)}\n`;
            });
            responseContent += '\nThis is the most efficient way to settle up!';
          }
          action.type = 'show_settlement'; // No confirmation needed
        } else if (action.type === 'share_summary') {
          const { balances, settlements } = calculateSettlements(trip, expenses);
          const shareText = generateShareText(trip, expenses, settlements, balances);

          try {
            await navigator.clipboard.writeText(shareText);
            responseContent = '📋 **Summary copied to clipboard!**\n\nYou can now paste it in WhatsApp, SMS, or any other app.';
          } catch {
            responseContent = 'Here\'s your trip summary:\n\n```\n' + shareText + '\n```';
          }
        }

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseContent,
          timestamp: new Date(),
          action: (action.type === 'add_expense' || action.type === 'add_transfer') ? action : undefined
        };

        setMessages(prev => [...prev, aiMessage]);

        if (action.type === 'add_expense' || action.type === 'add_transfer') {
          setPendingAction({ messageId: aiMessage.id, action });
        }
      } else {
        // Regular AI response for questions/analysis
        const totalExpensesAmount = expenses.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
        const categoryBreakdown: Record<string, number> = {};

        expenses.filter(e => e.type === 'expense').forEach(e => {
          categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + e.amount;
        });

        const topCategoriesList = Object.entries(categoryBreakdown)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([cat, amt]) => `${cat}: ₹${amt}`)
          .join(', ');

        const participantBalances: Record<string, number> = {};
        trip.participants.forEach(p => {
          participantBalances[p.name] = 0;
        });

        expenses.forEach(expense => {
          if (expense.type === 'expense' && expense.paidBy) {
            const payer = trip.participants.find(p => p.id === expense.paidBy);
            if (payer) {
              participantBalances[payer.name] += expense.amount;
            }
            expense.split.forEach(split => {
              const participant = trip.participants.find(p => p.id === split.participantId);
              if (participant) {
                participantBalances[participant.name] -= split.amount;
              }
            });
          }
        });

        const balancesSummaryText = Object.entries(participantBalances)
          .map(([name, balance]) => `${name}: ${balance >= 0 ? '+' : ''}₹${balance.toFixed(2)}`)
          .join(', ');

        const tripContext = {
          transactions: expenses.map(e => ({
            id: e.id,
            type: e.type,
            amount: e.amount,
            category: e.category,
            description: e.title,
            date: e.date
          })),
          budgets: [],
          goals: [],
          userName: trip.participants.find(p => p.isCurrentUser)?.name || 'User',
          tripSummary: {
            totalExpenses: totalExpensesAmount,
            topCategories: topCategoriesList,
            balances: balancesSummaryText,
            participantCount: trip.participants.length
          }
        };

        const conversationHistory = messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        }));

        const response = await generateAIResponse(
          currentInput,
          conversationHistory as any,
          tripContext
        );

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: response.message,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error.message || 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { text: 'Add ₹500 for dinner', icon: Plus },
    { text: 'Who owes whom?', icon: ArrowRightLeft },
    { text: 'Category breakdown', icon: Sparkles },
    { text: 'Share trip summary', icon: Sparkles }
  ];

  return (
    <div className="flex flex-col h-full min-h-[400px] max-h-[calc(100vh-320px)] relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
      {/* Messages Container - Scrollable */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto space-y-3 p-4 min-h-0 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-800">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
              {message.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Assistant</span>
                </div>
              )}
              <div className={`rounded-2xl px-4 py-3 ${message.role === 'user'
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}>
                {message.role === 'assistant' ? (
                  <MarkdownText content={message.content} className="text-sm leading-relaxed" />
                ) : (
                  <p className="text-sm leading-relaxed">{message.content}</p>
                )}
              </div>

              {/* Action Confirmation Buttons */}
              <AnimatePresence>
                {message.action && !message.action.executed && pendingAction?.messageId === message.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex gap-2 mt-2"
                  >
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleConfirmAction(message.id)}
                      className="flex items-center gap-1 px-4 py-2 bg-green-500 text-white rounded-full text-xs font-medium shadow-md"
                    >
                      <Check className="w-3 h-3" />
                      Add
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleRejectAction(message.id)}
                      className="flex items-center gap-1 px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-full text-xs font-medium"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </motion.button>
                  </motion.div>
                )}

                {message.action?.executed && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1 mt-2 text-xs text-green-500"
                  >
                    <Check className="w-3 h-3" />
                    Added successfully
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
              <span className="text-sm text-gray-600 dark:text-gray-300">Thinking...</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Quick Actions */}
      {messages.length <= 2 && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, index) => {
              const IconComponent = action.icon;
              return (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setInputMessage(action.text);
                    setTimeout(() => handleSendMessage(), 100);
                  }}
                  className="flex items-center gap-1 text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                >
                  <IconComponent className="w-3 h-3" />
                  <span>{action.text}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Input Bar */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask or add expense..."
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="p-2.5 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default TripAIChatAssistant;
