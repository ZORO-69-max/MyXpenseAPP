import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, AlertTriangle } from 'lucide-react';
import { verifyPIN, checkPINAttempts, recordPINAttempt } from '../utils/security';

interface SecretVaultPINEntryProps {
  pinHash: string;
  pinSalt: string;
  isCloudVault?: boolean;
  externalError?: string | null;
  isLoading?: boolean;
  onSuccess: (pin: string) => void;
  onCancel: () => void;
  onForgotPIN: () => void;
}

const SecretVaultPINEntry = ({ pinHash, pinSalt, isCloudVault = false, externalError, isLoading = false, onSuccess, onCancel, onForgotPIN }: SecretVaultPINEntryProps) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutEndsAt, setLockoutEndsAt] = useState<number | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState(5);

  useEffect(() => {
    const attemptCheck = checkPINAttempts();
    if (!attemptCheck.allowed && attemptCheck.lockoutEndsAt) {
      setIsLocked(true);
      setLockoutEndsAt(attemptCheck.lockoutEndsAt);
    } else if (attemptCheck.remainingAttempts !== undefined) {
      setRemainingAttempts(attemptCheck.remainingAttempts);
    }
  }, []);

  useEffect(() => {
    if (externalError) {
      setError(externalError);
      setPin('');
    }
  }, [externalError]);

  useEffect(() => {
    if (isLocked && lockoutEndsAt) {
      const interval = setInterval(() => {
        const now = Date.now();
        if (now >= lockoutEndsAt) {
          setIsLocked(false);
          setLockoutEndsAt(null);
          setRemainingAttempts(5);
          clearInterval(interval);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isLocked, lockoutEndsAt]);

  const handlePINInput = (digit: string) => {
    if (pin.length < 4 && !isLocked && !isLoading) {
      const newPin = pin + digit;
      setPin(newPin);
      setError('');

      if (newPin.length === 4) {
        verifyPINCode(newPin);
      }
    }
  };

  const verifyPINCode = async (pinToVerify: string) => {
    if (isCloudVault) {
      onSuccess(pinToVerify);
      return;
    }

    const isValid = await verifyPIN(pinToVerify, pinSalt, pinHash);

    if (isValid) {
      recordPINAttempt(true);
      onSuccess(pinToVerify);
    } else {
      recordPINAttempt(false);
      const attemptCheck = checkPINAttempts();

      if (!attemptCheck.allowed && attemptCheck.lockoutEndsAt) {
        setIsLocked(true);
        setLockoutEndsAt(attemptCheck.lockoutEndsAt);
        setError('Too many failed attempts. Vault locked.');
      } else {
        setError('Incorrect PIN');
        if (attemptCheck.remainingAttempts !== undefined) {
          setRemainingAttempts(attemptCheck.remainingAttempts);
        }
      }

      setTimeout(() => {
        setPin('');
        setError('');
      }, 1000);
    }
  };

  const handlePINDelete = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const formatLockoutTime = () => {
    if (!lockoutEndsAt) return '';
    const remaining = Math.ceil((lockoutEndsAt - Date.now()) / 1000);
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderPINDots = () => {
    return (
      <div className="flex space-x-4 justify-center mb-6">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className={`w-4 h-4 rounded-full border-2 transition-all ${i < pin.length
                ? 'bg-white border-white shadow-lg shadow-white/50'
                : 'border-white/40'
              }`}
          />
        ))}
      </div>
    );
  };

  const renderNumPad = () => {
    return (
      <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <motion.button
            key={num}
            whileTap={{ scale: isLocked ? 1 : 0.92 }}
            onClick={() => handlePINInput(num.toString())}
            disabled={isLocked}
            className={`aspect-square rounded-2xl text-2xl font-bold transition-all ${isLocked
                ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                : 'bg-gradient-to-br from-yellow-300 to-yellow-600 text-white shadow-lg shadow-yellow-700/40 hover:shadow-xl hover:shadow-yellow-700/60 active:shadow-md'
              }`}
          >
            {num}
          </motion.button>
        ))}
        <div></div>
        <motion.button
          whileTap={{ scale: isLocked ? 1 : 0.92 }}
          onClick={() => handlePINInput('0')}
          disabled={isLocked}
          className={`aspect-square rounded-2xl text-2xl font-bold transition-all ${isLocked
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : 'bg-gradient-to-br from-yellow-300 to-yellow-600 text-white shadow-lg shadow-yellow-700/40 hover:shadow-xl hover:shadow-yellow-700/60 active:shadow-md'
            }`}
        >
          0
        </motion.button>
        <motion.button
          whileTap={{ scale: isLocked ? 1 : 0.92 }}
          onClick={handlePINDelete}
          disabled={isLocked}
          className={`aspect-square rounded-2xl text-xl font-bold transition-all ${isLocked
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
              : 'bg-red-500 text-white shadow-lg shadow-red-600/40 hover:shadow-xl hover:shadow-red-600/60 active:shadow-md'
            }`}
        >
          ←
        </motion.button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onCancel}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        className="relative bg-slate-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
      >
        {/* Golden-Orange Header */}
        <div className="relative bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 px-4 pt-4 pb-6 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center justify-center">
            {isLocked ? (
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-xl animate-pulse">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-xl ring-2 ring-white/30">
                <Lock className="w-8 h-8 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Dark Navy Body */}
        <div className="relative z-10 text-center space-y-4 px-4 py-6">

          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              {isLocked ? 'Vault Locked' : isLoading ? 'Decrypting...' : 'Enter PIN'}
            </h2>
            <p className="text-white/90 text-sm">
              {isLocked
                ? `Try again in ${formatLockoutTime()}`
                : isLoading
                  ? 'Restoring your vault from cloud'
                  : isCloudVault
                    ? 'Enter your PIN to restore vault from cloud'
                    : 'Enter your 4-digit PIN to access vault'}
            </p>
          </div>

          {!isLocked && remainingAttempts < 5 && (
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 ring-1 ring-white/30">
              <p className="text-white text-sm font-medium">
                {remainingAttempts} {remainingAttempts === 1 ? 'attempt' : 'attempts'} remaining
              </p>
            </div>
          )}

          {renderPINDots()}

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-500 text-sm font-medium"
            >
              {error}
            </motion.p>
          )}

          {renderNumPad()}

          <div className="flex space-x-3 pt-4">
            <button
              onClick={onForgotPIN}
              className="flex-1 text-white hover:text-orange-100 font-medium transition-colors underline"
            >
              Forgot PIN?
            </button>
            <button
              onClick={onCancel}
              className="flex-1 bg-orange-400/60 hover:bg-orange-500/70 text-white py-3 px-6 rounded-2xl font-medium transition-colors shadow-md shadow-orange-600/30 hover:shadow-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SecretVaultPINEntry;
