import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Key, HelpCircle, ArrowRight, ArrowLeft, Check, ShieldCheck } from 'lucide-react';
import { generateSalt, hashPIN } from '../utils/security';

interface SecretVaultSetupProps {
  onComplete: (pinHash: string, pinSalt: string, secretQuestion: string, secretAnswerHash: string, pin: string, secretAnswerSalt?: string) => void;
  onCancel: () => void;
}

const SecretVaultSetup = ({ onComplete, onCancel }: SecretVaultSetupProps) => {
  const [step, setStep] = useState<'welcome' | 'pin' | 'confirm' | 'question' | 'success'>('welcome');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [secretQuestion, setSecretQuestion] = useState('');
  const [secretAnswer, setSecretAnswer] = useState('');
  const [error, setError] = useState('');
  const vaultDataRef = useRef<{ pinHash: string, pinSalt: string, secretQuestion: string, secretAnswerHash: string, pin: string, secretAnswerSalt?: string } | null>(null);
  const timerRef = useRef<number | null>(null);

  const predefinedQuestions = [
    "What is your mother's maiden name?",
    "What was the name of your first pet?",
    "What city were you born in?",
    "What is your favorite color?",
    "What was your childhood nickname?"
  ];

  const handlePINInput = (digit: string) => {
    if (step === 'pin' && pin.length < 4) {
      setPin(pin + digit);
      setError('');
    } else if (step === 'confirm' && confirmPin.length < 4) {
      const newConfirmPin = confirmPin + digit;
      setConfirmPin(newConfirmPin);
      setError('');

      if (newConfirmPin.length === 4) {
        if (newConfirmPin !== pin) {
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
    if (step === 'pin') {
      setPin(pin.slice(0, -1));
      setError('');
    } else if (step === 'confirm') {
      setConfirmPin(confirmPin.slice(0, -1));
      setError('');
    }
  };

  const handleNextFromPIN = () => {
    if (pin.length === 4) {
      setStep('confirm');
    } else {
      setError('Please enter a 4-digit PIN');
    }
  };

  const handleNextFromConfirm = () => {
    if (confirmPin === pin && confirmPin.length === 4) {
      setStep('question');
    }
  };

  const handleFinish = async () => {
    if (!secretQuestion || !secretAnswer) {
      setError('Please provide both question and answer');
      return;
    }

    if (secretAnswer.length < 3) {
      setError('Answer must be at least 3 characters');
      return;
    }

    const pinSalt = generateSalt();
    const pinHash = await hashPIN(pin, pinSalt);

    // Use a dedicated salt for the security answer
    const answerSalt = generateSalt();
    const answerHash = await hashPIN(secretAnswer.toLowerCase().trim(), answerSalt);

    // Store vault data in ref to use in useEffect
    vaultDataRef.current = {
      pinHash,
      pinSalt,
      secretQuestion,
      secretAnswerHash: answerHash,
      secretAnswerSalt: answerSalt,
      pin
    };

    setStep('success');
  };

  // Auto-dismiss success screen after 1.5 seconds
  useEffect(() => {
    if (step === 'success' && vaultDataRef.current) {
      timerRef.current = setTimeout(() => {
        const data = vaultDataRef.current;
        if (data) {
          onComplete(data.pinHash, data.pinSalt, data.secretQuestion, data.secretAnswerHash, data.pin, data.secretAnswerSalt);
        }
      }, 1500);

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }
  }, [step, onComplete]);

  const handleContinue = () => {
    console.log('Continue button clicked');
    // Clear auto-dismiss timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const data = vaultDataRef.current;
    console.log('Vault data:', data);
    if (data) {
      console.log('Calling onComplete...');
      onComplete(data.pinHash, data.pinSalt, data.secretQuestion, data.secretAnswerHash, data.pin, data.secretAnswerSalt);
    } else {
      console.error('No vault data available!');
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
              ? 'bg-yellow-500 border-yellow-500 shadow-lg shadow-yellow-500/50'
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
            className="aspect-square rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-white text-2xl font-bold shadow-lg hover:shadow-xl transition-all"
          >
            {num}
          </motion.button>
        ))}
        <div></div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => handlePINInput('0')}
          className="aspect-square rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-white text-2xl font-bold shadow-lg hover:shadow-xl transition-all"
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

  const handleBackdropClick = () => {
    if (step === 'success' && vaultDataRef.current) {
      const data = vaultDataRef.current;
      onComplete(data.pinHash, data.pinSalt, data.secretQuestion, data.secretAnswerHash, data.pin, data.secretAnswerSalt);
    } else {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={handleBackdropClick}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="relative bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl w-full max-w-md p-6 shadow-2xl"
      >
        <AnimatePresence mode="wait">
          {step === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-6"
            >
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center shadow-xl">
                <Lock className="w-12 h-12 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Secret Vault
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Create a secure vault to store your secret savings
                </p>
              </div>
              <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-xl p-4 text-left">
                <div className="flex items-start space-x-3">
                  <ShieldCheck className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <p className="font-semibold mb-1">Your vault is protected by:</p>
                    <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                      <li>4-digit PIN code</li>
                      <li>Secret security question</li>
                      <li>End-to-end encryption</li>
                    </ul>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setStep('pin')}
                className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center space-x-2"
              >
                <span>Get Started</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={onCancel}
                className="w-full text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          )}

          {step === 'pin' && (
            <motion.div
              key="pin"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <Key className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Create Your PIN
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Choose a 4-digit PIN to secure your vault
                </p>
              </div>
              {renderPINDots(pin)}
              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}
              {renderNumPad()}
              <div className="flex space-x-3">
                <button
                  onClick={() => setStep('welcome')}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 px-6 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 mx-auto" />
                </button>
                <button
                  onClick={handleNextFromPIN}
                  disabled={pin.length !== 4}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-amber-600 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:cursor-not-allowed disabled:opacity-50"
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
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <Check className="w-16 h-16 mx-auto text-green-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Confirm Your PIN
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Re-enter your PIN to confirm
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
                  onClick={() => { setStep('pin'); setConfirmPin(''); }}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 px-6 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 mx-auto" />
                </button>
                <button
                  onClick={handleNextFromConfirm}
                  disabled={confirmPin.length !== 4 || confirmPin !== pin}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-amber-600 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}

          {step === 'question' && (
            <motion.div
              key="question"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center">
                <HelpCircle className="w-16 h-16 mx-auto text-blue-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Security Question
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  This helps you reset your PIN if forgotten
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select a security question
                </label>
                <select
                  value={secretQuestion}
                  onChange={(e) => {
                    setSecretQuestion(e.target.value);
                    setError('');
                  }}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                >
                  <option value="">Choose a question...</option>
                  {predefinedQuestions.map((q, i) => (
                    <option key={i} value={q}>{q}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your answer
                </label>
                <input
                  type="text"
                  value={secretAnswer}
                  onChange={(e) => {
                    setSecretAnswer(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter your answer"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}
              <div className="flex space-x-3">
                <button
                  onClick={() => { setStep('confirm'); setSecretQuestion(''); setSecretAnswer(''); }}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 px-6 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 mx-auto" />
                </button>
                <button
                  onClick={handleFinish}
                  disabled={!secretQuestion || !secretAnswer}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-amber-600 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Complete Setup
                </button>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center space-y-6 py-8"
            >
              {/* Confetti/celebration effect */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{
                      x: '50%',
                      y: '50%',
                      opacity: 0,
                      scale: 0
                    }}
                    animate={{
                      x: `${Math.random() * 100}%`,
                      y: `${Math.random() * 100}%`,
                      opacity: [0, 1, 0],
                      scale: [0, 1, 0.5],
                      rotate: Math.random() * 360
                    }}
                    transition={{
                      duration: 1.5,
                      delay: i * 0.05,
                      ease: 'easeOut'
                    }}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: ['#fbbf24', '#10b981', '#3b82f6', '#f59e0b'][i % 4]
                    }}
                  />
                ))}
              </div>

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, duration: 0.6, type: 'spring', stiffness: 200, damping: 15 }}
                className="w-24 h-24 mx-auto bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl relative"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.5, 0, 0.5]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity
                  }}
                  className="absolute inset-0 bg-green-400 rounded-full"
                />
                <Check className="w-16 h-16 text-white relative z-10" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Vault Created!
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Your secret vault is now ready to use
                </p>
              </motion.div>
              <motion.div
                className="flex space-x-2 justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2
                    }}
                    className="w-2 h-2 bg-yellow-500 rounded-full"
                  />
                ))}
              </motion.div>
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                onClick={handleContinue}
                className="mt-6 w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                Continue
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default SecretVaultSetup;
