import { useState } from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, Key, ArrowLeft, Check } from 'lucide-react';
import { generateSalt, hashPIN, verifyPIN } from '../utils/security';

interface SecretVaultForgotPINProps {
  secretQuestion: string;
  secretAnswerHash: string;
  currentPinSalt: string;
  secretAnswerSalt?: string;
  onResetComplete: (newPinHash: string, newPinSalt: string, newPin: string) => void;
  onCancel: () => void;
}

const SecretVaultForgotPIN = ({
  secretQuestion,
  secretAnswerHash,
  currentPinSalt,
  secretAnswerSalt,
  onResetComplete,
  onCancel
}: SecretVaultForgotPINProps) => {
  const [step, setStep] = useState<'question' | 'newpin' | 'confirm' | 'success'>('question');
  const [answer, setAnswer] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  const verifyAnswer = async () => {
    // Use dedicated salt if available, otherwise fall back to pinSalt (legacy behavior)
    const saltToUse = secretAnswerSalt || currentPinSalt;
    const isValid = await verifyPIN(answer.toLowerCase().trim(), saltToUse, secretAnswerHash);

    if (isValid) {
      setStep('newpin');
      setError('');
    } else {
      setError('Incorrect answer. Please try again.');
    }
  };

  const handlePINInput = (digit: string) => {
    if (step === 'newpin' && newPin.length < 4) {
      setNewPin(newPin + digit);
      setError('');
    } else if (step === 'confirm' && confirmPin.length < 4) {
      const newConfirmPin = confirmPin + digit;
      setConfirmPin(newConfirmPin);
      setError('');

      if (newConfirmPin.length === 4) {
        if (newConfirmPin !== newPin) {
          setError('PINs do not match');
          setTimeout(() => {
            setConfirmPin('');
            setError('');
          }, 1000);
        }
      }
    }
  };

  const handlePINDelete = () => {
    if (step === 'newpin') {
      setNewPin(newPin.slice(0, -1));
      setError('');
    } else if (step === 'confirm') {
      setConfirmPin(confirmPin.slice(0, -1));
      setError('');
    }
  };

  const handleNextFromNewPIN = () => {
    if (newPin.length === 4) {
      setStep('confirm');
    } else {
      setError('Please enter a 4-digit PIN');
    }
  };

  const handleFinish = async () => {
    if (confirmPin === newPin && confirmPin.length === 4) {
      setStep('success');

      const newPinSalt = generateSalt();
      const newPinHash = await hashPIN(newPin, newPinSalt);

      setTimeout(() => {
        onResetComplete(newPinHash, newPinSalt, newPin);
      }, 2000);
    }
  };

  const renderPINDots = (value: string) => {
    return (
      <div className="flex space-x-4 justify-center mb-6">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className={`w-4 h-4 rounded-full border-2 transition-all ${i < value.length
              ? 'bg-blue-500 border-blue-500 shadow-lg shadow-blue-500/50'
              : 'border-gray-400 dark:border-gray-600'
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
            whileTap={{ scale: 0.95 }}
            onClick={() => handlePINInput(num.toString())}
            className="aspect-square rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white text-2xl font-bold shadow-lg hover:shadow-xl transition-all"
          >
            {num}
          </motion.button>
        ))}
        <div></div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => handlePINInput('0')}
          className="aspect-square rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white text-2xl font-bold shadow-lg hover:shadow-xl transition-all"
        >
          0
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handlePINDelete}
          className="aspect-square rounded-xl bg-red-500 hover:bg-red-600 text-white text-xl font-bold shadow-lg hover:shadow-xl transition-all"
        >
          ←
        </motion.button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70" onClick={onCancel}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        className="relative bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md p-6 shadow-2xl"
      >
        {step === 'question' && (
          <motion.div
            key="question"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <HelpCircle className="w-16 h-16 mx-auto text-blue-500 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Reset PIN
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Answer your security question
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4">
              {secretQuestion ? (
                <p className="text-blue-900 dark:text-blue-300 font-medium">
                  {secretQuestion}
                </p>
              ) : (
                <div className="text-center">
                  <p className="text-amber-700 dark:text-amber-400 font-medium mb-2">
                    Security question not available
                  </p>
                  <p className="text-amber-600 dark:text-amber-500 text-sm">
                    Please access your vault from your original device to sync recovery data to cloud.
                  </p>
                </div>
              )}
            </div>
            <div>
              <input
                type="text"
                value={answer}
                onChange={(e) => {
                  setAnswer(e.target.value);
                  setError('');
                }}
                placeholder="Enter your answer"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}
            <div className="flex space-x-3">
              <button
                onClick={onCancel}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 px-6 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={verifyAnswer}
                disabled={!answer}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:cursor-not-allowed"
              >
                Verify
              </button>
            </div>
          </motion.div>
        )}

        {step === 'newpin' && (
          <motion.div
            key="newpin"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <Key className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Create New PIN
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Choose a new 4-digit PIN
              </p>
            </div>
            {renderPINDots(newPin)}
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}
            {renderNumPad()}
            <div className="flex space-x-3">
              <button
                onClick={() => { setStep('question'); setNewPin(''); }}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 px-6 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mx-auto" />
              </button>
              <button
                onClick={handleNextFromNewPIN}
                disabled={newPin.length !== 4}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}

        {step === 'confirm' && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <Check className="w-16 h-16 mx-auto text-green-500 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Confirm New PIN
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Re-enter your new PIN to confirm
              </p>
            </div>
            {renderPINDots(confirmPin)}
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-500 text-sm text-center font-medium"
              >
                {error}
              </motion.p>
            )}
            {renderNumPad()}
            <div className="flex space-x-3">
              <button
                onClick={() => { setStep('newpin'); setConfirmPin(''); }}
                className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 px-6 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mx-auto" />
              </button>
              <button
                onClick={handleFinish}
                disabled={confirmPin.length !== 4 || confirmPin !== newPin}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:cursor-not-allowed"
              >
                Reset PIN
              </button>
            </div>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-6 py-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-24 h-24 mx-auto bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl"
            >
              <Check className="w-16 h-16 text-white" />
            </motion.div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                PIN Reset Successful!
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Your new PIN has been set
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default SecretVaultForgotPIN;
