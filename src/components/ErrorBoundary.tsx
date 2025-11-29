/**
 * Enhanced Error Boundary Component
 * 
 * Catches React component errors and displays a user-friendly fallback UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { logError } from '@/lib/errorHandler';
import * as Sentry from '@/lib/sentry';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error
    logError(error, {
      component: 'ErrorBoundary',
      action: 'ComponentError',
      additionalData: {
        componentStack: errorInfo.componentStack,
      },
    });

    // Report to Sentry
    if (import.meta.env.PROD && Sentry.Sentry) {
      Sentry.Sentry.withScope((scope: any) => {
        scope.setContext('errorInfo', {
          componentStack: errorInfo.componentStack,
        });
        Sentry.Sentry.captureException(error);
      });
    }

    // Store error info
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset error boundary if resetKeys change
    if (hasError && resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );
      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }

    // Reset error boundary if props change and resetOnPropsChange is true
    if (hasError && resetOnPropsChange) {
      const hasPropsChanged = Object.keys(this.props).some(
        (key) => key !== 'children' && this.props[key as keyof Props] !== prevProps[key as keyof Props]
      );
      if (hasPropsChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          showDetails={this.props.showDetails || import.meta.env.DEV}
          onReset={this.resetErrorBoundary}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  onReset: () => void;
}

function ErrorFallback({ error, errorInfo, showDetails, onReset }: ErrorFallbackProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-2xl w-full">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-lg font-semibold mb-2">
            Something went wrong
          </AlertTitle>
          <AlertDescription className="space-y-4">
            <p>
              We're sorry, but something unexpected happened. Our team has been notified
              and is working to fix the issue.
            </p>

            {showDetails && error && (
              <div className="mt-4 p-4 bg-destructive/10 rounded-md">
                <p className="font-mono text-sm text-destructive mb-2">
                  {error.toString()}
                </p>
                {errorInfo?.componentStack && (
                  <pre className="text-xs overflow-auto max-h-64 p-2 bg-background rounded border">
                    {errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <Button
                onClick={onReset}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button
                onClick={() => navigate('/')}
                variant="default"
                className="flex-1"
              >
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

// Export as both default and named export for flexibility
export default ErrorBoundaryClass;
export { ErrorBoundaryClass as ErrorBoundary };

