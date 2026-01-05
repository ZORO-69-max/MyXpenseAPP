import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Wallet, ArrowRight, ShieldCheck, Loader, Mail, Lock, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ParticleBackground from '../components/ParticleBackground';
import PageTransition from '../components/PageTransition';
import { motion, AnimatePresence } from 'framer-motion';

const LoginPage = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { currentUser, signIn, signUp, signInWithGoogle } = useAuth();

  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        if (!name.trim()) {
          setError('Please enter your full name');
          setIsLoading(false);
          return;
        }
        await signUp(email, password, name);
      } else {
        await signIn(email, password);
      }
      navigate('/');
    } catch (err: any) {
      console.error('Auth error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Email already in use. Please login instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);
    try {
      await signInWithGoogle();
      navigate('/');
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Popup blocked. Please allow popups for this site.');
      } else {
        setError(err.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center p-4">
        <ParticleBackground />

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="login-card rounded-3xl p-8 w-full max-w-md relative z-10"
        >
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="bg-gradient-to-r from-blue-500 to-blue-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl"
            >
              <Wallet className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome to MyXpense</h1>
            <p className="text-blue-200">Your smart expense tracking companion</p>
          </div>

          {/* Mode Toggle */}
          <div className="flex bg-white/10 rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${mode === 'login'
                ? 'bg-white text-blue-600 shadow-lg'
                : 'text-white hover:bg-white/10'
                }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError('');
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${mode === 'signup'
                ? 'bg-white text-blue-600 shadow-lg'
                : 'text-white hover:bg-white/10'
                }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <label className="block text-sm font-medium text-blue-200 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-300" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="form-input w-full pl-12 pr-4 py-4 rounded-xl text-white placeholder-blue-300 focus:outline-none"
                      placeholder="John Doe"
                      required={mode === 'signup'}
                      autoComplete="name"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-300" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input w-full pl-12 pr-4 py-4 rounded-xl text-white placeholder-blue-300 focus:outline-none"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-300" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input w-full pl-12 pr-4 py-4 rounded-xl text-white placeholder-blue-300 focus:outline-none"
                  placeholder="••••••••"
                  required
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  minLength={6}
                />
              </div>
              {mode === 'signup' && (
                <p className="text-xs text-blue-200 mt-1">At least 6 characters</p>
              )}
              {mode === 'login' && (
                <div className="text-right mt-1">
                  <Link
                    to="/forgotpassword"
                    className="text-xs text-blue-200 hover:text-white transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>
              )}
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/20 border border-red-400 text-red-200 px-4 py-3 rounded-lg text-sm"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              className="login-btn w-full py-4 rounded-xl font-semibold text-white text-lg disabled:opacity-50 flex items-center justify-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader className="w-5 h-5 inline mr-2 animate-spin" />
                  {mode === 'signup' ? 'Creating Account...' : 'Logging in...'}
                </>
              ) : (
                <>
                  <ArrowRight className="w-5 h-5 inline mr-2" />
                  {mode === 'signup' ? 'Create Account' : 'Login'}
                </>
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-blue-300/30"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-transparent text-blue-200">OR</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full bg-white hover:bg-gray-100 text-gray-800 font-semibold py-4 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="text-center mt-6">
            <p className="text-blue-300 text-sm flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 inline mr-1" />
              Your data is stored securely on your device
            </p>
          </div>
        </motion.div>


        <style>{`
          .login-card {
            backdrop-filter: blur(10px);
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          
          .form-input {
            backdrop-filter: blur(5px);
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          
          .form-input:focus {
            background: rgba(255, 255, 255, 0.2);
            border-color: rgba(59, 130, 246, 0.5);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }
          
          .login-btn {
            background: linear-gradient(135deg, #0f172a, #020617);
            transition: all 0.3s ease;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.8);
            border: 2px solid rgba(0, 0, 0, 0.3);
          }
          
          .login-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.9);
            background: linear-gradient(135deg, #020617, #000000);
            border-color: rgba(0, 0, 0, 0.5);
          }
        `}</style>
      </div>
    </PageTransition>
  );
};

export default LoginPage;
