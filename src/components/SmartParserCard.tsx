import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Clipboard, CheckCircle, RotateCcw, Image as ImageIcon, Loader2 } from 'lucide-react';
import { parseSMS, type ParsedTransaction } from '../utils/smsParser';
import { parseReceiptImage, detectCategoryWithAI, parseTransactionTextWithAI } from '../services/openai';
import imageCompression from 'browser-image-compression';

interface SmartParserCardProps {
    onSave: (transactions: ParsedTransaction[]) => Promise<void>;
}

export default function SmartParserCard({ onSave }: SmartParserCardProps) {
    const [step, setStep] = useState<'input' | 'review'>('input');
    const [text, setText] = useState('');
    const [parsedItems, setParsedItems] = useState<ParsedTransaction[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStatus, setProcessingStatus] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleParse = async () => {
        setIsProcessing(true);
        setProcessingStatus('AI parsing transaction...');

        try {
            // Try AI parsing first (Gemini primary, OpenAI fallback)
            const aiResult = await parseTransactionTextWithAI(text);

            if (aiResult.transactions.length > 0) {
                // Convert AI result to ParsedTransaction format
                const aiParsedItems: ParsedTransaction[] = aiResult.transactions.map((t, idx) => ({
                    id: `ai_${Date.now()}_${idx}`,
                    originalText: text,
                    type: t.type,
                    amount: t.amount,
                    date: new Date(t.date),
                    entity: t.entity,
                    description: t.description,
                    category: t.category,
                    paymentMethod: t.paymentMethod,
                    debtType: t.debtType,
                    confidence: t.confidence
                }));

                setParsedItems(aiParsedItems);
                setStep('review');
            } else {
                // Fallback to regex parser if AI returns nothing
                setProcessingStatus('Using fallback parser...');
                const items = parseSMS(text);

                if (items.length > 0) {
                    // Enhance with AI category detection
                    setProcessingStatus('Detecting categories...');
                    const enhancedItems = await Promise.all(
                        items.map(async (item) => {
                            try {
                                const aiCategory = await detectCategoryWithAI(
                                    item.entity,
                                    item.description,
                                    item.type as 'income' | 'expense'
                                );
                                return { ...item, category: aiCategory };
                            } catch {
                                return item;
                            }
                        })
                    );

                    setParsedItems(enhancedItems);
                    setStep('review');
                } else {
                    console.log("No transactions found");
                }
            }
        } catch (error) {
            console.error("Parsing error:", error);
            // Try regex fallback on error
            const items = parseSMS(text);
            if (items.length > 0) {
                setParsedItems(items);
                setStep('review');
            }
        } finally {
            setIsProcessing(false);
            setProcessingStatus('');
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setProcessingStatus('Compressing image...');

        try {
            // Compress image
            const options = {
                maxSizeMB: 0.5,
                maxWidthOrHeight: 1024,
                useWebWorker: true,
                initialQuality: 0.8
            };
            const compressedFile = await imageCompression(file, options);

            // Convert to base64
            setProcessingStatus('Reading image...');
            const reader = new FileReader();

            reader.onloadend = async () => {
                const base64 = reader.result as string;

                setProcessingStatus('AI scanning receipt...');
                const result = await parseReceiptImage(base64);

                if (result.transactions.length > 0) {
                    // Convert to ParsedTransaction format
                    const parsedFromImage: ParsedTransaction[] = result.transactions.map((t, idx) => ({
                        id: `img_${Date.now()}_${idx}`,
                        originalText: `Receipt: ${t.entity} - ${t.description}`,
                        type: t.type,
                        amount: t.amount,
                        date: new Date(t.date),
                        entity: t.entity,
                        description: t.description,
                        category: t.category,
                        paymentMethod: t.paymentMethod,
                        confidence: 'high' as const
                    }));

                    setParsedItems(parsedFromImage);
                    setStep('review');
                } else {
                    console.error('No transactions extracted:', result.error);
                    alert(result.error || 'Could not extract transactions from image');
                }

                setIsProcessing(false);
                setProcessingStatus('');
            };

            reader.readAsDataURL(compressedFile);
        } catch (error: any) {
            console.error('Image processing error:', error);
            alert('Failed to process image');
            setIsProcessing(false);
            setProcessingStatus('');
        }

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const updateItem = (id: string, updates: Partial<ParsedTransaction>) => {
        setParsedItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    const removeItem = (id: string) => {
        setParsedItems(prev => prev.filter(item => item.id !== id));
    };

    const handleSaveAll = async () => {
        await onSave(parsedItems);
        // Reset after save
        setStep('input');
        setText('');
        setParsedItems([]);
    };

    const handleCancel = () => {
        setStep('input');
        setText('');
        setParsedItems([]);
    };

    return (
        <motion.div
            layout
            className="bg-white dark:bg-gray-900 rounded-xl p-3 shadow-sm border border-indigo-100 dark:border-indigo-900/30"
        >
            <div className="flex items-center justify-between gap-3 mb-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 shrink-0">
                    <Clipboard className="w-4 h-4 text-purple-500" />
                    Smart Parser
                </h3>

                {step === 'input' ? (
                    <div className="flex items-center gap-2">
                        {/* Image Upload - Compact Icon Button */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isProcessing}
                            className="p-1.5 rounded-md text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors disabled:opacity-50"
                            title="Upload Receipt"
                        >
                            <ImageIcon className="w-4 h-4" />
                        </motion.button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                        />

                        {/* Parse Button - Compact */}
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={handleParse}
                            disabled={!text.trim() || isProcessing}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                        >
                            {isProcessing ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <>Parse <ArrowRight className="w-3.5 h-3.5" /></>
                            )}
                        </motion.button>
                    </div>
                ) : (
                    <button
                        onClick={handleCancel}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-1"
                    >
                        Reset
                    </button>
                )}
            </div>

            <AnimatePresence mode="wait">
                {step === 'input' ? (
                    <motion.div
                        key="input"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Paste SMS here..."
                            className="w-full h-10 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 border border-gray-100 dark:border-gray-800 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none text-sm font-medium transition-all"
                            disabled={isProcessing}
                        />

                        {/* Processing Status */}
                        {isProcessing && (
                            <div className="flex items-center gap-2 mt-2 text-[10px] text-purple-600 dark:text-purple-400 justify-end">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                {processingStatus}
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="review"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4"
                    >
                        <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Found {parsedItems.length} transactions</span>
                            <button
                                onClick={() => setStep('input')}
                                className="text-purple-500 hover:underline flex items-center gap-1"
                            >
                                <RotateCcw className="w-3 h-3" /> Retry
                            </button>
                        </div>

                        <div className="space-y-3 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                            {parsedItems.map((item) => (
                                <ReviewCard
                                    key={item.id}
                                    item={item}
                                    onChange={(updates) => updateItem(item.id, updates)}
                                    onDelete={() => removeItem(item.id)}
                                />
                            ))}
                            {parsedItems.length === 0 && (
                                <div className="text-center py-4 text-gray-400 text-xs">
                                    No transactions remaining.
                                </div>
                            )}
                        </div>

                        {parsedItems.length > 0 && (
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={handleSaveAll}
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 text-sm shadow-sm hover:shadow transition-all"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Save All
                            </motion.button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

const ReviewCard = ({
    item,
    onChange,
    onDelete,
}: {
    item: ParsedTransaction,
    onChange: (u: Partial<ParsedTransaction>) => void,
    onDelete: () => void,
}) => {
    return (
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 relative group">
            <button
                onClick={onDelete}
                className="absolute top-2 right-2 text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <X className="w-3.5 h-3.5" />
            </button>

            {/* Type & Amount Row */}
            <div className="flex items-center gap-3 mb-2">
                <select
                    value={item.type}
                    onChange={(e) => onChange({ type: e.target.value as any })}
                    className={`text-xs font-semibold uppercase tracking-wide bg-transparent border-0 p-0 cursor-pointer focus:ring-0 ${item.type === 'income' ? 'text-green-600' :
                        item.type === 'expense' ? 'text-red-600' : 'text-blue-600'
                        }`}
                >
                    <option value="expense">EXPENSE</option>
                    <option value="income">INCOME</option>
                    <option value="debt">DEBT</option>
                </select>

                <div className="flex-1 relative">
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₹</span>
                    <input
                        type="number"
                        value={item.amount}
                        onChange={(e) => onChange({ amount: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-3 bg-transparent border-none p-0 text-sm font-bold text-gray-900 dark:text-white focus:ring-0"
                    />
                </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-2 mb-2">
                <input
                    type="text"
                    value={item.entity}
                    onChange={(e) => onChange({ entity: e.target.value })}
                    className="col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-purple-500 outline-none"
                    placeholder={item.type === 'expense' ? 'Merchant' : 'Sender'}
                />

                <input
                    type="date"
                    value={item.date.toISOString().split('T')[0]}
                    onChange={(e) => onChange({ date: new Date(e.target.value) })}
                    max={new Date().toISOString().split('T')[0]}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-purple-500 outline-none"
                />

                {item.type === 'expense' && (
                    <select
                        value={item.category || 'other'}
                        onChange={(e) => onChange({ category: e.target.value })}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-purple-500 outline-none"
                    >
                        <option value="food">Food</option>
                        <option value="transport">Travel</option>
                        <option value="shopping">Shop</option>
                        <option value="entertainment">Fun</option>
                        <option value="bills">Bills</option>
                        <option value="health">Health</option>
                        <option value="education">Education</option>
                        <option value="other">Other</option>
                    </select>
                )}

                {item.type === 'income' && (
                    <select
                        value={item.category || 'Other'}
                        onChange={(e) => onChange({ category: e.target.value })}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-purple-500 outline-none"
                    >
                        <option value="Salary">Salary</option>
                        <option value="Freelance">Freelance</option>
                        <option value="Investment">Investment</option>
                        <option value="Gift">Gift</option>
                        <option value="Pocket Money">Pocket Money</option>
                        <option value="Parents">Parents</option>
                        <option value="Other">Other</option>
                    </select>
                )}
            </div>

            {item.type === 'debt' && (
                <div className="flex gap-1">
                    <button
                        onClick={() => onChange({ debtType: 'lent' })}
                        className={`flex-1 py-1 rounded text-[10px] font-medium border ${item.debtType === 'lent' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-200 text-gray-500'}`}
                    >
                        Lent
                    </button>
                    <button
                        onClick={() => onChange({ debtType: 'borrowed' })}
                        className={`flex-1 py-1 rounded text-[10px] font-medium border ${item.debtType === 'borrowed' ? 'bg-amber-50 border-amber-200 text-amber-600' : 'border-gray-200 text-gray-500'}`}
                    >
                        Borrowed
                    </button>
                </div>
            )}
        </div>
    );
};
