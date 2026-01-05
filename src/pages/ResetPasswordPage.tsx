import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowLeft, Wallet, Loader, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../config/firebase';
import ParticleBackground from '../components/ParticleBackground';
import PageTransition from '../components/PageTransition';
import { motion } from 'framer-motion';

const ResetPasswordPage = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(true);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [email, setEmail] = useState('');

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const oobCode = searchParams.get('oobCode'); // Firebase password reset code from URL

    // Verify the reset code on mount
    useEffect(() => {
        const verifyCode = async () => {
            if (!oobCode) {
                setError('Invalid or missing password reset link. Please request a new one.');
                setIsVerifying(false);
                return;
            }

            if (!auth) {
                setError('Authentication service is not available. Please try again later.');
                setIsVerifying(false);
                return;
            }

            try {
                // Verify the password reset code is valid
                const userEmail = await verifyPasswordResetCode(auth!, oobCode);
                setEmail(userEmail);
                setIsVerifying(false);
            } catch (err: any) {
                console.error('Invalid reset code:', err);
                if (err.code === 'auth/expired-action-code') {
                    setError('This password reset link has expired. Please request a new one.');
                } else if (err.code === 'auth/invalid-action-code') {
                    setError('This password reset link is invalid or has already been used.');
                } else {
                    setError('Unable to verify reset link. Please try again.');
                }
                setIsVerifying(false);
            }
        };

        verifyCode();
    }, [oobCode]);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validate passwords
        if (password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (!oobCode) {
            setError('Invalid reset code.');
            return;
        }

        if (!auth) {
            setError('Authentication not initialized.');
            return;
        }

        setIsLoading(true);

        try {
            // Confirm the password reset
            await confirmPasswordReset(auth, oobCode, password);
            setSuccess('Your password has been reset successfully!');

            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err: any) {
            console.error('Password reset error:', err);
            if (err.code === 'auth/expired-action-code') {
                setError('This password reset link has expired. Please request a new one.');
            } else if (err.code === 'auth/invalid-action-code') {
                setError('This password reset link is invalid or has already been used.');
            } else if (err.code === 'auth/weak-password') {
                setError('Password is too weak. Please use a stronger password.');
            } else {
                setError(err.message || 'Failed to reset password. Please try again.');
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
                    <Link
                        to="/login"
                        className="inline-flex items-center text-blue-200 hover:text-white transition-colors mb-6 group"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                        Back to Login
                    </Link>

                    <div className="text-center mb-8">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl"
                        >
                            <Wallet className="w-8 h-8 text-white" />
                        </motion.div>
                        <h1 className="text-2xl font-bold text-white mb-2">Create New Password</h1>
                        {email && !error && (
                            <p className="text-blue-200 text-sm">
                                Setting new password for <strong>{email}</strong>
                            </p>
                        )}
                    </div>

                    {isVerifying ? (
                        <div className="text-center py-8">
                            <Loader className="w-8 h-8 text-white animate-spin mx-auto mb-4" />
                            <p className="text-blue-200">Verifying reset link...</p>
                        </div>
                    ) : error && !email ? (
                        <div className="text-center py-4">
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-red-500/20 border border-red-400/50 text-red-200 px-4 py-3 rounded-lg text-sm flex items-start mb-6"
                            >
                                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </motion.div>
                            <Link
                                to="/forgotpassword"
                                className="login-btn inline-block px-6 py-3 rounded-xl font-semibold text-white"
                            >
                                Request New Link
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleReset} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-blue-200 mb-2">
                                    New Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-300" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="form-input w-full pl-12 pr-12 py-4 rounded-xl text-white placeholder-blue-300 focus:outline-none transition-all"
                                        placeholder="Enter new password"
                                        required
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-blue-300 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-blue-200 mb-2">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-300" />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="form-input w-full pl-12 pr-12 py-4 rounded-xl text-white placeholder-blue-300 focus:outline-none transition-all"
                                        placeholder="Confirm new password"
                                        required
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-blue-300 hover:text-white transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-red-500/20 border border-red-400/50 text-red-200 px-4 py-3 rounded-lg text-sm flex items-start"
                                >
                                    <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </motion.div>
                            )}

                            {success && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-green-500/20 border border-green-400/50 text-green-200 px-4 py-3 rounded-lg text-sm flex items-start"
                                >
                                    <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <span>{success}</span>
                                        <p className="text-xs mt-1 text-green-300">Redirecting to login...</p>
                                    </div>
                                </motion.div>
                            )}

                            <button
                                type="submit"
                                className="login-btn w-full py-4 rounded-xl font-semibold text-white text-lg disabled:opacity-50 flex items-center justify-center shadow-lg"
                                disabled={isLoading || !!success}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader className="w-5 h-5 inline mr-2 animate-spin" />
                                        Resetting Password...
                                    </>
                                ) : (
                                    <>
                                        <Lock className="w-5 h-5 inline mr-2" />
                                        Reset Password
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </motion.div>

                <style>{`
          .login-card {
            backdrop-filter: blur(10px);
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
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
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          
          .login-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
            background: linear-gradient(135deg, #020617, #000000);
          }
        `}</style>
            </div>
        </PageTransition>
    );
};

export default ResetPasswordPage;
