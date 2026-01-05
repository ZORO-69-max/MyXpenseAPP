import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import SecretVaultSetup from '../components/SecretVaultSetup';
import SecretVaultPINEntry from '../components/SecretVaultPINEntry';
import SecretVaultDashboard from '../components/SecretVaultDashboard';
import SecretVaultForgotPIN from '../components/SecretVaultForgotPIN';
import PageTransition from '../components/PageTransition';
import { getSecretVault, saveSecretVault, type SecretVault, type VaultTransaction } from '../utils/db';
import { calculateFinanceStats } from '../utils/finance';
import { encryptData, decryptData, generateSalt, hashPIN } from '../utils/security';
import { useTransactions } from '../hooks/useFirestoreSync';
import { syncQueue } from '../services/syncQueue';
import { hybridDataService } from '../services/hybridDataService';
import { encryptedVaultSync } from '../services/encryptedVaultSync';
import { logger } from '../utils/logger';
import { useTripSettlements } from '../hooks/useTripSettlements';

const SecretVaultPage = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { transactions } = useTransactions();
  const { tripSettlements, loading: tripSettlementsLoading } = useTripSettlements();
  const [vaultMode, setVaultMode] = useState<'loading' | 'setup' | 'pin-entry' | 'dashboard' | 'forgot-pin'>('loading');
  const [vaultData, setVaultData] = useState<SecretVault | null>(null);
  const [vaultBalance, setVaultBalance] = useState(0);
  const [vaultHistory, setVaultHistory] = useState<VaultTransaction[]>([]);
  const [totalMainBalance, setTotalMainBalance] = useState(0);
  const [isCloudVault, setIsCloudVault] = useState(false);
  const [cloudVaultError, setCloudVaultError] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  useEffect(() => {
    loadVaultData();
  }, [userProfile]);

  // Calculate main balance from transactions hook using centralized logic
  useEffect(() => {
    const stats = calculateFinanceStats(transactions, tripSettlements);
    setTotalMainBalance(stats.balance);
  }, [transactions, tripSettlements, tripSettlementsLoading]);

  const loadVaultData = async () => {
    if (!userProfile?.uid) {
      setVaultMode('loading');
      return;
    }

    const vault = await getSecretVault(userProfile.uid);
    if (vault) {
      setVaultData(vault);
      setVaultHistory(vault.vaultHistory || []);
      // Cloud vault = balance needs to be restored from cloud (empty local balance)
      // This works because placeholder vaults now have pinHash from cloud but empty balance
      const needsCloudRestore = !vault.vaultBalanceEncrypted || vault.vaultBalanceEncrypted === '';
      setIsCloudVault(needsCloudRestore);
      setVaultMode('pin-entry');
    } else {
      // No local vault - check if there's a cloud vault to restore
      // This is critical for returning users on new devices
      try {
        const cloudVaultExists = await hybridDataService.syncVaultFromCloud();
        if (cloudVaultExists) {
          // Cloud vault found and placeholder created, reload vault data
          const cloudVault = await getSecretVault(userProfile.uid);
          if (cloudVault) {
            setVaultData(cloudVault);
            setVaultHistory(cloudVault.vaultHistory || []);
            // Balance is empty in placeholder, needs cloud restore
            const needsCloudRestore = !cloudVault.vaultBalanceEncrypted || cloudVault.vaultBalanceEncrypted === '';
            setIsCloudVault(needsCloudRestore);
            setVaultMode('pin-entry');
            logger.debug('Cloud vault detected for returning user');
            return;
          }
        }
      } catch (error) {
        logger.error('Error checking for cloud vault:', error);
      }

      // No local vault and no cloud vault - show setup
      setVaultMode('setup');
    }
  };

  if (vaultMode === 'loading' || tripSettlementsLoading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading vault...</p>
          </div>
        </div>
      </PageTransition>
    );
  }


  const handleVaultSetupComplete = async (pinHash: string, pinSalt: string, secretQuestion: string, secretAnswerHash: string, pin: string, secretAnswerSalt?: string) => {
    if (!userProfile?.uid) return;

    const initialBalance = 0;
    const encryptedBalance = await encryptData(initialBalance.toString(), pin, pinSalt);

    const vault: SecretVault = {
      id: `vault_${userProfile.uid}`,
      userId: userProfile.uid,
      pinHash,
      pinSalt,
      secretQuestion,
      secretAnswerHash,
      secretAnswerSalt: secretAnswerSalt,
      vaultBalanceEncrypted: encryptedBalance,
      vaultHistory: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await saveSecretVault(vault);

    // Queue for Firebase sync
    syncQueue.enqueue('add', 'vault', vault).catch(err => {
      logger.error('Failed to queue vault for sync:', err);
    });

    setVaultData(vault);
    setVaultBalance(0);
    setVaultHistory([]);
    sessionStorage.setItem('vault_pin_temp', pin);
    setVaultMode('dashboard');
  };

  const handleVaultPINSuccess = async (pin: string) => {
    if (!vaultData || !userProfile?.uid) return;

    setCloudVaultError(null);

    try {
      if (isCloudVault) {
        setIsDecrypting(true);

        const cloudData = hybridDataService.getCloudVaultData();
        if (!cloudData) {
          logger.error('Cloud vault data not found in storage');
          setCloudVaultError('Cloud vault data not found. Please try again.');
          setIsDecrypting(false);
          return;
        }

        const restoredVault = await encryptedVaultSync.decryptVaultFromSync(cloudData, pin);

        const newPinSalt = generateSalt();
        const newPinHash = await hashPIN(pin, newPinSalt);
        const newEncryptedBalance = await encryptData(
          restoredVault.vaultBalanceEncrypted,
          pin,
          newPinSalt
        );

        const fullVault: SecretVault = {
          ...restoredVault,
          pinHash: newPinHash,
          pinSalt: newPinSalt,
          vaultBalanceEncrypted: newEncryptedBalance,
          updatedAt: new Date()
        };

        await saveSecretVault(fullVault);
        hybridDataService.clearCloudVaultData();

        setVaultData(fullVault);
        setVaultBalance(parseFloat(restoredVault.vaultBalanceEncrypted));
        setVaultHistory(fullVault.vaultHistory || []);
        setIsCloudVault(false);
        setIsDecrypting(false);
        sessionStorage.setItem('vault_pin_temp', pin);
        setVaultMode('dashboard');

        logger.debug('Cloud vault successfully restored and saved locally');
      } else {
        const decryptedBalance = await decryptData(vaultData.vaultBalanceEncrypted, pin, vaultData.pinSalt);
        setVaultBalance(parseFloat(decryptedBalance));
        sessionStorage.setItem('vault_pin_temp', pin);
        setVaultMode('dashboard');

        // Trigger cloud re-sync with new format (pinHash, secretQuestion, etc.)
        // This ensures cross-device access works after accessing from original device
        hybridDataService.saveVault(vaultData, pin).catch(err => {
          logger.warn('Background vault cloud sync failed:', err);
        });
      }
    } catch (error) {
      console.error('Error decrypting vault balance:', error);
      setIsDecrypting(false);
      if (isCloudVault) {
        logger.error('Failed to decrypt cloud vault - wrong PIN');
        setCloudVaultError('Incorrect PIN. Please try again.');
      }
      setVaultBalance(0);
    }
  };

  const handleVaultAddMoney = async (amount: number, note: string) => {
    if (!vaultData || !userProfile?.uid) return;

    const pin = sessionStorage.getItem('vault_pin_temp') || '';
    const newBalance = vaultBalance + amount;
    const encryptedBalance = await encryptData(newBalance.toString(), pin, vaultData.pinSalt);

    const transaction: VaultTransaction = {
      id: `vault_tx_${Date.now()}`,
      type: 'add',
      amount,
      date: new Date(),
      note
    };

    const updatedVault = {
      ...vaultData,
      vaultBalanceEncrypted: encryptedBalance,
      vaultHistory: [...vaultData.vaultHistory, transaction],
      updatedAt: new Date()
    };

    await saveSecretVault(updatedVault);

    // Queue for Firebase sync
    syncQueue.enqueue('update', 'vault', updatedVault).catch(err => {
      logger.error('Failed to queue vault update for sync:', err);
    });

    setVaultData(updatedVault);
    setVaultBalance(newBalance);
    setVaultHistory(updatedVault.vaultHistory);
  };

  const handleVaultWithdrawMoney = async (amount: number, note: string) => {
    if (!vaultData || !userProfile?.uid) return;

    const pin = sessionStorage.getItem('vault_pin_temp') || '';
    const newBalance = vaultBalance - amount;
    const encryptedBalance = await encryptData(newBalance.toString(), pin, vaultData.pinSalt);

    const transaction: VaultTransaction = {
      id: `vault_tx_${Date.now()}`,
      type: 'withdraw',
      amount,
      date: new Date(),
      note
    };

    const updatedVault = {
      ...vaultData,
      vaultBalanceEncrypted: encryptedBalance,
      vaultHistory: [...vaultData.vaultHistory, transaction],
      updatedAt: new Date()
    };

    await saveSecretVault(updatedVault);

    // Queue for Firebase sync
    syncQueue.enqueue('update', 'vault', updatedVault).catch(err => {
      logger.error('Failed to queue vault update for sync:', err);
    });

    setVaultData(updatedVault);
    setVaultBalance(newBalance);
    setVaultHistory(updatedVault.vaultHistory);
  };

  const handleResetPIN = async (newPinHash: string, newPinSalt: string, newPin: string) => {
    if (!vaultData || !userProfile?.uid) return;

    const encryptedBalance = await encryptData(vaultBalance.toString(), newPin, newPinSalt);

    const updatedVault = {
      ...vaultData,
      pinHash: newPinHash,
      pinSalt: newPinSalt,
      // If existing vault logic relied on pinSalt (legacy), preserve it as dedicated secretAnswerSalt now
      secretAnswerSalt: vaultData.secretAnswerSalt || vaultData.pinSalt,
      vaultBalanceEncrypted: encryptedBalance,
      updatedAt: new Date()
    };

    await saveSecretVault(updatedVault);

    // Queue for Firebase sync
    syncQueue.enqueue('update', 'vault', updatedVault).catch(err => {
      logger.error('Failed to queue vault update for sync:', err);
    });

    // Attempt immediate cloud sync to prevent 'Wrong PIN' on other devices
    if (newPin) {
      hybridDataService.saveVault(updatedVault, newPin).catch(err => {
        logger.warn('Immediate cloud sync after reset failed, will rely on queue:', err);
      });
    }

    setVaultData(updatedVault);
    sessionStorage.removeItem('vault_pin_temp');
    setVaultMode('pin-entry');
  };

  const handleVaultClose = () => {
    sessionStorage.removeItem('vault_pin_temp');
    navigate('/', { replace: true });
  };



  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/', { replace: true })}
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back to Dashboard</span>
            </motion.button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Secret Vault</h1>
            <div className="w-24"></div>
          </div>
        </div>

        {/* Content */}
        <div className="flex items-center justify-center min-h-[calc(100vh-73px)] p-4">
          {vaultMode === 'setup' && (
            <SecretVaultSetup
              onComplete={handleVaultSetupComplete}
              onCancel={handleVaultClose}
            />
          )}

          {vaultMode === 'pin-entry' && vaultData && (
            <SecretVaultPINEntry
              pinHash={vaultData.pinHash}
              pinSalt={vaultData.pinSalt}
              isCloudVault={isCloudVault}
              externalError={cloudVaultError}
              isLoading={isDecrypting}
              onSuccess={handleVaultPINSuccess}
              onCancel={handleVaultClose}
              onForgotPIN={() => setVaultMode('forgot-pin')}
            />
          )}

          {vaultMode === 'dashboard' && (
            <SecretVaultDashboard
              vaultBalance={vaultBalance}
              vaultHistory={vaultHistory}
              totalBalance={totalMainBalance}
              onAddMoney={handleVaultAddMoney}
              onWithdrawMoney={handleVaultWithdrawMoney}
              onClose={handleVaultClose}
            />
          )}

          {vaultMode === 'forgot-pin' && vaultData && (
            <SecretVaultForgotPIN
              secretQuestion={vaultData.secretQuestion}
              secretAnswerHash={vaultData.secretAnswerHash}
              currentPinSalt={vaultData.pinSalt}
              secretAnswerSalt={vaultData.secretAnswerSalt}
              onResetComplete={handleResetPIN}
              onCancel={() => setVaultMode('pin-entry')}
            />
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default SecretVaultPage;
