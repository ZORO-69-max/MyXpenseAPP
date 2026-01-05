import { useState, useRef, useEffect } from 'react';
import { X, ArrowRightLeft, Wallet, CreditCard, Banknote, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { hybridDataService } from '../services/hybridDataService';
import type { Transaction, PaymentMethod } from '../types';
import { getSecretVault, saveSecretVault, type SecretVault, type VaultTransaction } from '../utils/db';
import { verifyPIN, encryptData, decryptData } from '../utils/security';
import { generateUUID } from '../utils/helpers';

interface TransferFundsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTransferComplete?: () => void;
}

export const TransferFundsModal = ({ isOpen, onClose, onTransferComplete }: TransferFundsModalProps) => {
    const { currentUser } = useAuth();
    const [fromAccount, setFromAccount] = useState<PaymentMethod | ''>('');
    const [toAccount, setToAccount] = useState<PaymentMethod | ''>('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Secret Vault specific state
    const [vaultPin, setVaultPin] = useState('');
    const [vaultData, setVaultData] = useState<SecretVault | null>(null);
    const [isVaultVerified, setIsVaultVerified] = useState(false);

    // Ref for the modal container to detect outside clicks
    const modalRef = useRef<HTMLDivElement>(null);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setFromAccount('');
            setToAccount('');
            setAmount('');
            setDate(new Date().toISOString().split('T')[0]);
            setDescription('');
            setError('');
            setVaultPin('');
            setVaultData(null);
            setIsVaultVerified(false);
        }
    }, [isOpen]);

    // Check if vault is involved
    const isVaultInvolved = fromAccount === 'secret_vault' || toAccount === 'secret_vault';

    useEffect(() => {
        if (isVaultInvolved && currentUser?.uid) {
            loadVaultData();
        } else {
            setVaultData(null);
            setIsVaultVerified(false);
            setVaultPin('');
        }
    }, [isVaultInvolved, currentUser]);

    const loadVaultData = async () => {
        if (!currentUser?.uid) return;
        try {
            const vault = await getSecretVault(currentUser.uid);
            if (vault) {
                setVaultData(vault);
            } else {
                setError('Secret Vault not set up. Please set it up in the Vault page first.');
            }
        } catch (err) {
            console.error('Error loading vault:', err);
            setError('Failed to load Secret Vault data');
        }
    };

    const verifyVaultPin = async () => {
        if (!vaultData || !vaultPin) return false;
        try {
            const isValid = await verifyPIN(vaultPin, vaultData.pinSalt, vaultData.pinHash);
            if (isValid) {
                setIsVaultVerified(true);
                setError('');
                return true;
            } else {
                setError('Incorrect PIN');
                return false;
            }
        } catch (err) {
            console.error('PIN verification error:', err);
            setError('Error verifying PIN');
            return false;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        if (!fromAccount || !toAccount || !amount) {
            setError('Please fill in all required fields');
            return;
        }
        if (fromAccount === toAccount) {
            setError('Source and destination accounts must be different');
            return;
        }

        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Secret Vault Handling
            if (isVaultInvolved) {
                if (!vaultData) {
                    throw new Error('Secret Vault data not found');
                }

                if (!isVaultVerified) {
                    const verified = await verifyVaultPin();
                    if (!verified) {
                        setLoading(false);
                        return;
                    }
                }

                // Decrypt current balance
                let currentVaultBalance = 0;
                try {
                    const decryptedBalance = await decryptData(vaultData.vaultBalanceEncrypted, vaultPin, vaultData.pinSalt);
                    currentVaultBalance = parseFloat(decryptedBalance);
                } catch (err) {
                    console.error('Error decrypting vault balance:', err);
                    throw new Error('Failed to access vault balance');
                }

                let newVaultBalance = currentVaultBalance;
                const historyEntry: VaultTransaction = {
                    id: `vault_tx_${Date.now()}`,
                    type: 'transfer',
                    amount: numericAmount,
                    date: (() => {
                        const d = new Date(date);
                        const now = new Date();
                        if (date === now.toISOString().split('T')[0]) {
                            d.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
                        }
                        return d;
                    })(),
                    note: description || `Transfer ${fromAccount === 'secret_vault' ? 'to' : 'from'} ${fromAccount === 'secret_vault' ? toAccount : fromAccount}`
                };

                // Logic for From/To Vault
                if (fromAccount === 'secret_vault') {
                    // Withdrawing from Vault
                    if (currentVaultBalance < numericAmount) {
                        throw new Error('Insufficient funds in Secret Vault');
                    }
                    newVaultBalance -= numericAmount;
                    historyEntry.type = 'withdraw';
                } else {
                    // depositing to Vault
                    newVaultBalance += numericAmount;
                    historyEntry.type = 'add'; // Treated as add
                }

                // Encrypt new balance
                const newEncryptedBalance = await encryptData(newVaultBalance.toString(), vaultPin, vaultData.pinSalt);

                // Update Vault
                const updatedVault: SecretVault = {
                    ...vaultData,
                    vaultBalanceEncrypted: newEncryptedBalance,
                    vaultHistory: [...(vaultData.vaultHistory || []), historyEntry],
                    updatedAt: new Date()
                };

                await saveSecretVault(updatedVault);
            }

            // Create standard transaction record
            const newTransfer: Transaction = {
                id: generateUUID(),
                userId: currentUser.uid,
                type: 'transfer',
                amount: numericAmount,
                category: 'Transfer',
                description: description || `Transfer from ${fromAccount === 'secret_vault' ? 'Secret Vault' : fromAccount} to ${toAccount === 'secret_vault' ? 'Secret Vault' : toAccount}`,
                date: new Date(date),
                paymentMethod: fromAccount,
                transferFrom: fromAccount,
                transferTo: toAccount,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await hybridDataService.saveTransaction(newTransfer);

            onTransferComplete?.();
            onClose();
        } catch (err: any) {
            console.error('Error creating transfer:', err);
            setError(err.message || 'Failed to create transfer');
        } finally {
            setLoading(false);
        }
    };

    const availableMethods: { id: PaymentMethod, label: string, icon: any }[] = [
        { id: 'cash', label: 'Cash', icon: Banknote },
        { id: 'upi', label: 'UPI', icon: Wallet },
        { id: 'card', label: 'Card', icon: CreditCard },
        { id: 'secret_vault', label: 'Secret Vault', icon: Lock },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        ref={modalRef}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                            <div className="flex items-center gap-2">
                                <ArrowRightLeft className="w-5 h-5" />
                                <h2 className="text-lg font-bold">Transfer Funds</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1 rounded-full hover:bg-white/20 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl">
                                    {error}
                                </div>
                            )}

                            {/* From & To Selection */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 pl-1">From</label>
                                    <select
                                        value={fromAccount}
                                        onChange={(e) => setFromAccount(e.target.value as PaymentMethod)}
                                        className="w-full p-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        required
                                    >
                                        <option value="">Select</option>
                                        {availableMethods.map((method) => (
                                            <option key={method.id} value={method.id} disabled={method.id === toAccount}>
                                                {method.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 pl-1">To</label>
                                    <select
                                        value={toAccount}
                                        onChange={(e) => setToAccount(e.target.value as PaymentMethod)}
                                        className="w-full p-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        required
                                    >
                                        <option value="">Select</option>
                                        {availableMethods.map((method) => (
                                            <option key={method.id} value={method.id} disabled={method.id === fromAccount}>
                                                {method.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Arrow Indicator */}
                            <div className="flex justify-center -my-2 opacity-50">
                                <ArrowRightLeft className="w-4 h-4 text-gray-400" />
                            </div>

                            {/* Amount */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 pl-1">Amount</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full pl-8 pr-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="0.00"
                                        required
                                        min="1"
                                        step="0.01"
                                    />
                                </div>
                            </div>

                            {/* Vault PIN Entry (if needed) */}
                            {isVaultInvolved && !isVaultVerified && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 pl-1">Secret Vault PIN</label>
                                    <input
                                        type="password"
                                        value={vaultPin}
                                        onChange={(e) => setVaultPin(e.target.value)}
                                        className="w-full p-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all tracking-widest"
                                        placeholder="Enter PIN to authorize"
                                        required={isVaultInvolved}
                                        maxLength={6}
                                    />
                                </div>
                            )}

                            {/* Date */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 pl-1">Date</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    max={new Date().toISOString().split('T')[0]}
                                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    required
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 pl-1">Note (Optional)</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="e.g., ATM Withdrawal"
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading || (isVaultInvolved && !vaultPin && !isVaultVerified)}
                                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transform active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                            >
                                {loading ? 'Processing...' : 'Transfer Funds'}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
