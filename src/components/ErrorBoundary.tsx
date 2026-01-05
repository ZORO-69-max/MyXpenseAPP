import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Detect if error is a chunk loading error (happens after new deployments)
const isChunkLoadError = (error: Error): boolean => {
  const message = error.message.toLowerCase();
  return (
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('loading chunk') ||
    message.includes('loading css chunk') ||
    message.includes('dynamically imported module') ||
    message.includes('chunk failed') ||
    message.includes('unable to preload')
  );
};

class ErrorBoundary extends Component<Props, State> {
  private hasAttemptedRefresh = false;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught error:', error, errorInfo);

    // If it's a chunk loading error, auto-refresh silently (only once to prevent loops)
    if (isChunkLoadError(error) && !this.hasAttemptedRefresh) {
      this.hasAttemptedRefresh = true;
      console.log('[ErrorBoundary] Chunk load error detected, auto-refreshing...');

      // Clear cache and reload
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }

      // Immediate reload attempts
      window.location.reload();
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // If it's a chunk load error, show nothing (or loading) while we refresh
      // This prevents the "Oops" screen from flashing
      if (this.state.error && isChunkLoadError(this.state.error)) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            {/* Silent refresh - just show a spinner or nothing */}
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full"
          >
            <div className="flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.5 }}
                className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6"
              >
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </motion.div>

              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Oops! Something went wrong
              </h1>

              <p className="text-gray-600 mb-6">
                Don't worry, your data is safe. Try refreshing the page.
              </p>

              {this.state.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 w-full">
                  <p className="text-xs text-red-700 font-mono text-left break-words">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="flex gap-3 w-full">
                <button
                  onClick={this.handleReload}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-teal-500 text-white py-3 px-4 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all"
                >
                  <RefreshCw className="w-5 h-5" />
                  Refresh Page
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition-all"
                >
                  <Home className="w-5 h-5" />
                  Go Home
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
