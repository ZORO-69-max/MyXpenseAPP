import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import OfflinePage from './components/OfflinePage';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import LoadingScreen from './components/LoadingScreen';
import TabLoadingScreen from './components/TabLoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useAndroidBackButton } from './hooks/useAndroidBackButton';
import { useFCM } from './hooks/useFCM';
import { syncQueue } from './services/syncQueue';
import MainLayout from './components/MainLayout';
import { ToastProvider } from './context/ToastContext';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const BudgetsPage = lazy(() => import('./pages/BudgetsPage'));
const GoalsPage = lazy(() => import('./pages/GoalsPage'));
const TransactionsPage = lazy(() => import('./pages/TransactionsPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const SecretVaultPage = lazy(() => import('./pages/SecretVaultPage'));
const TripsPage = lazy(() => import('./pages/TripsPage'));
const TripDetailPage = lazy(() => import('./pages/TripDetailPage'));
const UserManualPage = lazy(() => import('./components/UserManual'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));

function AnimatedRoutes() {
  const location = useLocation();
  const { loading } = useAuth();
  useAndroidBackButton();
  useFCM();

  // Initialize sync queue on app start
  useEffect(() => {
    const cleanup = syncQueue.startAutoSync();
    return cleanup;
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  const getTabLoadingScreen = () => {
    const path = location.pathname;
    if (path === '/analytics') return <TabLoadingScreen tab="analytics" />;
    if (path === '/budgets') return <TabLoadingScreen tab="budgets" />;
    if (path === '/goals') return <TabLoadingScreen tab="goals" />;
    return <LoadingScreen />;
  };

  return (
    <AnimatePresence mode="sync" initial={false}>
      <Suspense fallback={getTabLoadingScreen()}>
        <Routes location={location} key={location.pathname}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgotpassword" element={<ForgotPasswordPage />} />
          <Route path="/reset" element={<ResetPasswordPage />} />

          <Route
            element={
              <PrivateRoute>
                <MainLayout />
              </PrivateRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/budgets" element={<BudgetsPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/trips" element={<TripsPage />} />
            <Route path="/trips/:tripId" element={<TripDetailPage />} />
          </Route>

          <Route
            path="/vault"
            element={
              <PrivateRoute>
                <SecretVaultPage />
              </PrivateRoute>
            }
          />

          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/manual" element={<UserManualPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

function PWAPromptWrapper() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  return <PWAInstallPrompt onLoginPage={isLoginPage} />;
}

function App() {
  const isOnline = useOnlineStatus();

  if (!isOnline) {
    return <OfflinePage />;
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <AnimatedRoutes />
            <PWAPromptWrapper />
          </Router>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
