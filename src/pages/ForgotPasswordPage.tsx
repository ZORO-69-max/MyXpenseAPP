import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Wallet, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ParticleBackground from '../components/ParticleBackground';
import PageTransition from '../components/PageTransition';
import { motion } from 'framer-motion';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const { resetPassword } = useAuth();

    // If oobCode is present, redirect to reset password page
    useEffect(() => {
        const oobCode = searchParams.get('oobCode');
        const mode = searchParams.get('mode');
        if (oobCode && mode === 'resetPassword') {
            // Redirect to the reset page with the oobCode
            navigate(`/reset?oobCode=${oobCode}`, { replace: true });
        }
    }, [searchParams, navigate]);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        try {
            await resetPassword(email);
            setSuccess('Password reset link sent! Please check your email inbox.');
            setEmail('');
        } catch (err: any) {
            console.error('Password reset error:', err);
            if (err.code === 'auth/user-not-found') {
                setError('No account found with this email.');
            } else if (err.code === 'auth/invalid-email') {
                setError('Invalid email address.');
            } else {
                setError(err.message || 'Failed to send reset email. Please try again.');
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
                        <h1 className="text-2xl font-bold text-white mb-2">Reset Password</h1>
                        <p className="text-blue-200 text-sm">
                            Enter your email to receive a password reset link
                        </p>
                    </div>

                    <form onSubmit={handleReset} className="space-y-6">
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
                                    className="form-input w-full pl-12 pr-4 py-4 rounded-xl text-white placeholder-blue-300 focus:outline-none transition-all"
                                    placeholder="you@example.com"
                                    required
                                    autoComplete="email"
                                />
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
                                <span>{success}</span>
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            className="login-btn w-full py-4 rounded-xl font-semibold text-white text-lg disabled:opacity-50 flex items-center justify-center shadow-lg"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <Loader className="w-5 h-5 inline mr-2 animate-spin" />
                                    Sending Link...
                                </>
                            ) : (
                                <>
                                    <Mail className="w-5 h-5 inline mr-2" />
                                    Send Reset Link
                                </>
                            )}
                        </button>
                    </form>
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

export default ForgotPasswordPage;
