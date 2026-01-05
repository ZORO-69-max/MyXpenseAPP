import { useState, useRef } from 'react';
import { X, Upload, Camera } from 'lucide-react';
import { motion } from 'framer-motion';
import imageCompression from 'browser-image-compression';
import { useAuth } from '../context/AuthContext';
import { useTransactions } from '../hooks/useFirestoreSync';

interface ScanReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionExtracted?: () => void;
}

const ScanReceiptModal = ({ isOpen, onClose, onTransactionExtracted }: ScanReceiptModalProps) => {
  const { currentUser } = useAuth();
  const { addTransaction } = useTransactions();
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showEditForm, setShowEditForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true
      };
      
      const compressedFile = await imageCompression(file, options);
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const imageData = reader.result as string;
        setReceiptImage(imageData);
        setIsCompressing(false);
        
        await scanReceiptWithAI(imageData);
      };
      
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error('Error compressing image:', error);
      setIsCompressing(false);
    }
  };

  const scanReceiptWithAI = async (imageBase64: string) => {
    setIsScanning(true);
    try {
      const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
      
      if (!OPENAI_API_KEY) {
        console.warn('OpenAI API key not configured, showing manual entry form');
        setShowEditForm(true);
        setIsScanning(false);
        return;
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert at analyzing receipts and UPI transaction screenshots. Extract transaction details accurately. If the image is not a valid receipt or UPI screenshot, indicate this.'
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Analyze this image and extract the transaction details. Respond in JSON format with: {"isValid": boolean, "type": "expense" or "income", "amount": number, "description": string, "category": string (Food/Transport/Shopping/Entertainment/Bills/Health/Education/Other), "paymentMethod": string (UPI/Cash/Card/Net Banking), "merchant": string}'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageBase64
                  }
                }
              ]
            }
          ],
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error('Failed to scan receipt with AI');
      }

      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);

      if (!result.isValid) {
        alert('This does not appear to be a valid receipt or UPI transaction screenshot. Please upload a clear image of a receipt or transaction.');
        setReceiptImage(null);
        setIsScanning(false);
        return;
      }

      setTransactionType(result.type || 'expense');
      setAmount(result.amount?.toString() || '');
      setDescription(result.description || result.merchant || '');
      setCategory(result.category || 'Other');
      setPaymentMethod(result.paymentMethod || 'UPI');
      setShowEditForm(true);
      setIsScanning(false);
    } catch (error) {
      console.error('Error scanning receipt:', error);
      setShowEditForm(true);
      setIsScanning(false);
    }
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!currentUser) {
      alert('Please sign in to add transactions');
      return;
    }

    const now = new Date();
    const transaction = {
      id: `tx_${Date.now()}`,
      userId: currentUser.uid,
      type: transactionType,
      amount: parseFloat(amount),
      category: category || (transactionType === 'expense' ? 'other' : 'Other'),
      description: description || 'Scanned transaction',
      paymentMethod,
      receiptUrl: receiptImage || undefined,
      date: new Date(selectedDate),
      createdAt: now,
      updatedAt: now,
    };

    try {
      await addTransaction(transaction);
      
      // Call the callback to update parent state BEFORE closing
      if (onTransactionExtracted) {
        onTransactionExtracted();
      }
      
      handleClose();
    } catch (error) {
      console.error('Error adding scanned transaction:', error);
      alert('Failed to add transaction. Please try again.');
    }
  };

  const handleClose = () => {
    setReceiptImage(null);
    setAmount('');
    setDescription('');
    setCategory('');
    setPaymentMethod('UPI');
    setShowEditForm(false);
    setSelectedDate(new Date().toISOString().split('T')[0]);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Scan Receipt</h2>
          <button onClick={handleClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {isScanning && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">AI is analyzing your receipt...</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">Detecting amount, description, and category</p>
              </div>
            </div>
          )}
          
          {!receiptImage ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Upload a receipt or UPI transaction screenshot to automatically extract transaction details using AI
              </p>

              {/* Upload Options */}
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCompressing}
                  className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 transition-colors flex flex-col items-center gap-2"
                >
                  <Upload className="w-8 h-8 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {isCompressing ? 'Processing...' : 'Upload from Gallery'}
                  </span>
                </button>

                <button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.capture = 'environment';
                    input.onchange = (e: any) => handleImageUpload(e);
                    input.click();
                  }}
                  disabled={isCompressing}
                  className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 transition-colors flex flex-col items-center gap-2"
                >
                  <Camera className="w-8 h-8 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Take Photo
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image Preview */}
              <div className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700">
                <img src={receiptImage} alt="Receipt" className="w-full h-auto" />
                <button
                  onClick={() => {
                    setReceiptImage(null);
                    setShowEditForm(false);
                  }}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Transaction Type Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-xl">
                <button
                  onClick={() => setTransactionType('expense')}
                  className={`py-2 px-4 rounded-lg font-medium transition-all ${
                    transactionType === 'expense'
                      ? 'bg-red-500 text-white shadow-lg'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Expense
                </button>
                <button
                  onClick={() => setTransactionType('income')}
                  className={`py-2 px-4 rounded-lg font-medium transition-all ${
                    transactionType === 'income'
                      ? 'bg-green-500 text-white shadow-lg'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Income
                </button>
              </div>

              {showEditForm && (
                <div className="space-y-3">
                  <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                    💡 Enter the transaction details from the receipt
                  </p>

                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Amount *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="w-full pl-8 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g., Grocery shopping"
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
                    >
                      <option value="">Select category</option>
                      <option value="Food">Food</option>
                      <option value="Transport">Transport</option>
                      <option value="Shopping">Shopping</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Bills">Bills</option>
                      <option value="Health">Health</option>
                      <option value="Education">Education</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
                    >
                      <option value="UPI">UPI</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Net Banking">Net Banking</option>
                    </select>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              {showEditForm && (
                <button
                  onClick={handleSubmit}
                  className="w-full py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
                >
                  Add Transaction
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ScanReceiptModal;
