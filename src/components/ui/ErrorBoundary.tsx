import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, WifiOff } from 'lucide-react';
import { isOffline } from '../../lib/utils/network';
import { handleError } from '../../lib/utils/errors';
import { logDebug } from '../../lib/utils/debug';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to debug system
    logDebug({
      function_name: 'ErrorBoundary.componentDidCatch',
      error_message: error.message,
      input_params: {
        error_name: error.name,
        error_stack: error.stack,
        component_stack: errorInfo.componentStack
      }
    });

    handleError(error, 'ErrorBoundary').catch(console.error);
  }

  public render() {
    if (this.state.hasError) {
      if (isOffline()) {
        return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
            <WifiOff className="h-12 w-12 text-gray-400 mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">No Internet Connection</h2>
            <p className="text-gray-500 text-center mb-4">
              {this.state.error ? formatErrorMessage(this.state.error) : 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              Retry
            </button>
          </div>
        );
      }

      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-500 text-center mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}