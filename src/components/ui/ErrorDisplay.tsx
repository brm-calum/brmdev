import React from 'react';
import { AlertTriangle, WifiOff } from 'lucide-react';
import { isOffline } from '../../lib/utils/network';

interface ErrorDisplayProps {
  error: Error;
  onRetry?: () => void;
}

export function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  if (isOffline()) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-gray-500">
        <WifiOff className="h-12 w-12 text-gray-400 mb-4" />
        <h2 className="text-lg font-medium text-gray-900 mb-2">No Internet Connection</h2>
        <p className="text-center mb-4">
          Please check your connection and try again
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-red-50 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-red-400" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">Error</h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{error.message}</p>
          </div>
          {onRetry && (
            <div className="mt-4">
              <button
                onClick={onRetry}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}