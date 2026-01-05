import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Utensils, Car, Home, Activity, ShoppingCart, Package, Lock, Unlock, AlertCircle, Smartphone, Banknote, CreditCard } from 'lucide-react';
import type { Trip, TripExpense } from '../types';
import { useAuth } from '../context/AuthContext';

interface AddTripExpenseModalProps {
  trip: Trip;
  onClose: () => void;
  onAdd: (expense: TripExpense) => void;
  initialExpense?: TripExpense;
}

const AddTripExpenseModal = ({ trip, onClose, onAdd, initialExpense }: AddTripExpenseModalProps) => {
  const { currentUser } = useAuth();
  const isEditing = !!initialExpense;
  const [type, setType] = useState<'expense' | 'income' | 'transfer'>(initialExpense?.type || 'expense');
  const [title, setTitle] = useState(initialExpense?.title || '');
  const [amount, setAmount] = useState(initialExpense?.amount.toString() || '');
  const [category, setCategory] = useState(initialExpense?.category || 'food');
  const [paidBy, setPaidBy] = useState(initialExpense?.paidBy || trip.participants.find(p => p.isCurrentUser)?.id || trip.participants[0].id);
  const [receivedBy, setReceivedBy] = useState(initialExpense?.receivedBy || trip.participants.find(p => p.isCurrentUser)?.id || trip.participants[0].id);
  const [from, setFrom] = useState(initialExpense?.from || trip.participants.find(p => p.isCurrentUser)?.id || trip.participants[0].id);
  const [transferTo, setTransferTo] = useState(initialExpense?.transferredTo || trip.participants.filter(p => !p.isCurrentUser)[0]?.id || trip.participants[1]?.id);
  const [splitType, setSplitType] = useState<'equally' | 'onlyMe' | 'custom'>(() => {
    if (!initialExpense?.split || initialExpense.split.length === 0) return 'equally';
    const myParticipant = trip.participants.find(p => p.isCurrentUser);
    const hasOnlyMySplit = myParticipant && initialExpense.split.length === 1 &&
      initialExpense.split[0].participantId === myParticipant.id &&
      initialExpense.split[0].amount === initialExpense.amount;
    if (hasOnlyMySplit) return 'onlyMe';
    if (initialExpense.split.every(s => s.amount === initialExpense.split[0].amount)) return 'equally';
    return 'custom';
  });

  // Smart Split State - track locked users and their fixed amounts
  const [lockedUsers, setLockedUsers] = useState<Set<string>>(() => {
    if (initialExpense?.split && splitType === 'custom') {
      // Mark all users with existing splits as locked
      return new Set(initialExpense.split.map(s => s.participantId));
    }
    return new Set();
  });

  const [customSplits, setCustomSplits] = useState<Record<string, string>>(() => {
    if (initialExpense?.split) {
      return initialExpense.split.reduce((acc, s) => ({ ...acc, [s.participantId]: s.amount.toString() }), {});
    }
    return {};
  });

  const [paymentMethod, setPaymentMethod] = useState(initialExpense?.paymentMethod || 'UPI');

  const [date, setDate] = useState(
    initialExpense?.date ? new Date(initialExpense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  );

  const categories = [
    { name: 'Food', icon: Utensils },
    { name: 'Transport', icon: Car },
    { name: 'Accommodation', icon: Home },
    { name: 'Activities', icon: Activity },
    { name: 'Shopping', icon: ShoppingCart },
    { name: 'Other', icon: Package }
  ];

  // Calculate auto-split for unlocked users when custom split is selected
  const calculatedSplits = useMemo(() => {
    if (splitType !== 'custom' || !amount) return {};

    const totalAmount = parseFloat(amount) || 0;

    // Sum locked amounts
    let lockedTotal = 0;
    lockedUsers.forEach(userId => {
      lockedTotal += parseFloat(customSplits[userId]) || 0;
    });

    // Calculate remaining for unlocked users
    const remainingAmount = totalAmount - lockedTotal;
    const unlockedParticipants = trip.participants.filter(p => !lockedUsers.has(p.id));

    if (unlockedParticipants.length === 0) {
      return customSplits;
    }

    // Calculate base share and apply rounding fix
    const baseShare = Math.floor((remainingAmount / unlockedParticipants.length) * 100) / 100;
    const totalDistributed = baseShare * (unlockedParticipants.length - 1);
    const lastPersonShare = Math.round((remainingAmount - totalDistributed) * 100) / 100;

    // Build new splits object with rounding adjustment on last person
    const newSplits: Record<string, string> = {};
    let unlockedIndex = 0;
    trip.participants.forEach(p => {
      if (lockedUsers.has(p.id)) {
        newSplits[p.id] = customSplits[p.id] || '0';
      } else {
        // Last unlocked participant absorbs rounding difference
        const isLastUnlocked = unlockedIndex === unlockedParticipants.length - 1;
        const shareAmount = isLastUnlocked ? lastPersonShare : baseShare;
        newSplits[p.id] = shareAmount >= 0 ? shareAmount.toFixed(2) : '0';
        unlockedIndex++;
      }
    });

    return newSplits;
  }, [amount, lockedUsers, customSplits, splitType, trip.participants]);

  // Validate split total
  const splitValidation = useMemo(() => {
    if (splitType !== 'custom' || !amount) return { valid: true, difference: 0 };

    const totalAmount = parseFloat(amount) || 0;
    const splitTotal = Object.values(calculatedSplits).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    const difference = Math.abs(totalAmount - splitTotal);

    return {
      valid: difference < 0.01,
      difference: parseFloat(difference.toFixed(2)),
      splitTotal: parseFloat(splitTotal.toFixed(2))
    };
  }, [amount, calculatedSplits, splitType]);

  // Handle custom split input change with smart auto-balancing
  const handleCustomSplitChange = (participantId: string, value: string) => {
    // Lock the user when they type a value
    if (value !== '' && value !== customSplits[participantId]) {
      setLockedUsers(prev => new Set(prev).add(participantId));
    }

    setCustomSplits(prev => ({
      ...prev,
      [participantId]: value
    }));
  };

  // Toggle lock status for a participant
  const toggleLock = (participantId: string) => {
    setLockedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(participantId)) {
        newSet.delete(participantId);
      } else {
        newSet.add(participantId);
      }
      return newSet;
    });
  };

  // Reset to equal split when switching to custom
  useEffect(() => {
    if (splitType === 'custom' && Object.keys(customSplits).length === 0 && amount) {
      const perPerson = (parseFloat(amount) || 0) / trip.participants.length;
      const initialSplits: Record<string, string> = {};
      trip.participants.forEach(p => {
        initialSplits[p.id] = perPerson.toFixed(2);
      });
      setCustomSplits(initialSplits);
      setLockedUsers(new Set()); // All unlocked initially
    }
  }, [splitType, amount, trip.participants]);

  const handleAddExpense = () => {
    if (!title.trim() || !amount || parseFloat(amount) <= 0) return;

    const amountNum = parseFloat(amount);
    let splits: Array<{ participantId: string; amount: number }> = [];

    if (type === 'transfer' || type === 'income') {
      // Transfer and income have no splits - income is personal pocket money
      splits = [];
    } else if (splitType === 'equally') {
      const perPerson = amountNum / trip.participants.length;
      splits = trip.participants.map(p => ({
        participantId: p.id,
        amount: parseFloat(perPerson.toFixed(2))
      }));
    } else if (splitType === 'onlyMe') {
      const myParticipant = trip.participants.find(p => p.isCurrentUser);
      if (myParticipant) {
        splits = [{
          participantId: myParticipant.id,
          amount: amountNum
        }];
      }
    } else {
      // Custom split - use calculated splits
      splits = Object.entries(calculatedSplits).map(([participantId, splitAmount]) => ({
        participantId,
        amount: parseFloat(splitAmount) || 0
      }));
    }

    const expense: TripExpense = {
      id: initialExpense?.id || `expense_${Date.now()}`,
      tripId: trip.id,
      userId: currentUser?.uid || '',
      type,
      title: title.trim(),
      amount: amountNum,
      category: category.toLowerCase(),
      icon: type === 'income' ? 'banknote' : '',
      date: new Date(date),
      paidBy: type === 'expense' ? paidBy : undefined,
      receivedBy: type === 'income' ? receivedBy : undefined,
      from: type === 'transfer' ? from : undefined,
      transferredTo: type === 'transfer' ? transferTo : undefined,
      split: splits,
      createdAt: initialExpense?.createdAt || new Date(),
      updatedAt: new Date(),
      paymentMethod
    };

    onAdd(expense);
  };

  // Calculate remaining amount for display
  const remainingToDistribute = useMemo(() => {
    if (splitType !== 'custom' || !amount) return 0;

    const totalAmount = parseFloat(amount) || 0;
    let lockedTotal = 0;
    lockedUsers.forEach(userId => {
      lockedTotal += parseFloat(customSplits[userId]) || 0;
    });

    return totalAmount - lockedTotal;
  }, [amount, lockedUsers, customSplits, splitType]);

  const unlockedCount = trip.participants.filter(p => !lockedUsers.has(p.id)).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* Type Tabs */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1 mb-6">
            <button
              onClick={() => setType('expense')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${type === 'expense' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-300'
                }`}
            >
              Expense
            </button>
            <button
              onClick={() => setType('income')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${type === 'income' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-300'
                }`}
            >
              Income
            </button>
            <button
              onClick={() => setType('transfer')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${type === 'transfer' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-600 dark:text-gray-300'
                }`}
            >
              Transfer
            </button>
          </div>

          {/* Title */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="E.g. Dinner"
                className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
              <div className="relative">
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="appearance-none h-full pl-10 pr-8 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
                >
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                </select>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  {paymentMethod === 'UPI' && <Smartphone className="w-5 h-5 text-gray-500" />}
                  {paymentMethod === 'Cash' && <Banknote className="w-5 h-5 text-gray-500" />}
                  {paymentMethod === 'Card' && <CreditCard className="w-5 h-5 text-gray-500" />}
                </div>
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Category (for expense only) */}
          {type === 'expense' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
              <div className="grid grid-cols-3 gap-1.5">
                {categories.map(cat => {
                  const IconComponent = cat.icon;
                  return (
                    <button
                      key={cat.name}
                      onClick={() => {
                        setCategory(cat.name.toLowerCase());
                      }}
                      className={`p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${category === cat.name.toLowerCase()
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                    >
                      <IconComponent className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <div className="text-[10px] font-medium text-gray-700 dark:text-gray-300">{cat.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Paid By (for expense) */}
          {type === 'expense' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Paid By</label>
              <select
                value={paidBy}
                onChange={e => setPaidBy(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {trip.participants.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.isCurrentUser && '(me)'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Received By (for income) */}
          {type === 'income' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Received By</label>
              <select
                value={receivedBy}
                onChange={e => setReceivedBy(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {trip.participants.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.isCurrentUser && '(me)'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Transfer From/To */}
          {type === 'transfer' && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">From</label>
                <select
                  value={from}
                  onChange={e => setFrom(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {trip.participants.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.isCurrentUser && '(me)'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Transferred To</label>
                <select
                  value={transferTo}
                  onChange={e => setTransferTo(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {trip.participants.filter(p => p.id !== from).map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.isCurrentUser && '(me)'}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* When */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">When</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Split (for expense only - income is personal pocket money with no splits) */}
          {type === 'expense' && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Split</label>
                <select
                  value={splitType}
                  onChange={e => {
                    setSplitType(e.target.value as 'equally' | 'onlyMe' | 'custom');
                    if (e.target.value !== 'custom') {
                      setLockedUsers(new Set());
                      setCustomSplits({});
                    }
                  }}
                  className="px-3 py-1.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="equally">Split Equally</option>
                  <option value="onlyMe">Only Me</option>
                  <option value="custom">Custom (Smart)</option>
                </select>
              </div>

              {/* Smart Split Info Banner */}
              {splitType === 'custom' && (
                <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                      <p className="font-medium mb-1">Smart Split Active</p>
                      <p>Type 0 to exclude someone. Lock (🔒) to fix an amount. Remaining auto-splits among unlocked members.</p>
                    </div>
                  </div>
                  {amount && (
                    <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-800 flex justify-between text-xs">
                      <span className="text-blue-600 dark:text-blue-400">
                        Remaining: ₹{remainingToDistribute.toFixed(2)} ÷ {unlockedCount} unlocked
                      </span>
                      <span className="text-blue-600 dark:text-blue-400">
                        = ₹{unlockedCount > 0 ? (remainingToDistribute / unlockedCount).toFixed(2) : '0.00'}/person
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                {splitType === 'onlyMe' ? (
                  <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-200 dark:border-blue-800">
                    <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                      Only you (entire amount)
                    </span>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      ₹{amount ? parseFloat(amount).toFixed(2) : '0.00'}
                    </span>
                  </div>
                ) : splitType === 'equally' ? (
                  trip.participants.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {p.name} {p.isCurrentUser && '(me)'}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        ₹{amount ? (parseFloat(amount) / trip.participants.length).toFixed(2) : '0.00'}
                      </span>
                    </div>
                  ))
                ) : (
                  // Custom Split with Smart Auto-Balancing
                  trip.participants.map(p => {
                    const isLocked = lockedUsers.has(p.id);
                    const displayValue = isLocked ? (customSplits[p.id] || '') : (calculatedSplits[p.id] || '');
                    const isExcluded = parseFloat(displayValue) === 0;

                    return (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between rounded-xl p-3 transition-colors ${isExcluded
                          ? 'bg-gray-100 dark:bg-gray-800 opacity-60'
                          : isLocked
                            ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                            : 'bg-gray-50 dark:bg-gray-700'
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleLock(p.id)}
                            className={`p-1 rounded transition-colors ${isLocked
                              ? 'text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                              : 'text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                              }`}
                            title={isLocked ? 'Unlock (auto-calculate)' : 'Lock (fix amount)'}
                          >
                            {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>
                          <span className={`text-sm ${isExcluded ? 'text-gray-400 line-through' : 'text-gray-700 dark:text-gray-300'}`}>
                            {p.name} {p.isCurrentUser && '(me)'}
                          </span>
                        </div>
                        <div className="relative w-24">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">₹</span>
                          <input
                            type="number"
                            value={displayValue}
                            onChange={e => handleCustomSplitChange(p.id, e.target.value)}
                            onFocus={() => {
                              // Lock when user starts typing
                              if (!isLocked) {
                                setLockedUsers(prev => new Set(prev).add(p.id));
                                setCustomSplits(prev => ({
                                  ...prev,
                                  [p.id]: displayValue
                                }));
                              }
                            }}
                            placeholder="0.00"
                            step="0.01"
                            className={`w-full pl-6 pr-2 py-1.5 text-sm rounded border ${isLocked
                              ? 'border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-700'
                              : 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600'
                              } text-gray-900 dark:text-white`}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Validation Message */}
              {splitType === 'custom' && !splitValidation.valid && amount && (
                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                  <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Split total (₹{splitValidation.splitTotal}) doesn't match expense (₹{parseFloat(amount).toFixed(2)}). Difference: ₹{splitValidation.difference}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Add Button */}
          <button
            onClick={handleAddExpense}
            disabled={!title.trim() || !amount || parseFloat(amount) <= 0 || (splitType === 'custom' && !splitValidation.valid)}
            className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isEditing ? 'Update' : 'Add'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AddTripExpenseModal;
