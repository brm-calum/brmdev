import React from 'react';
import { AlertTriangle, XCircle, AlertCircle, WifiOff } from 'lucide-react';
import { AppError, NetworkError, ValidationError, AuthError } from '../../lib/utils/errors';
import { logDebug } from '../../lib/utils/debug';

interface ErrorMessageProps {
  error: Error | null;
  onDismiss?: () => void;
}

export function ErrorMessage({ error, onDismiss }: ErrorMessageProps) {
  if (!error) return null;

  // Log error to debug system
  React.useEffect(() => {
    if (error) {
      logDebug({
        function_name: 'ErrorMessage',
        error_message: error.message,
        input_params: {
          error_type: error.constructor.name,
          error_stack: error.stack
        }
      });
    }
  }, [error]);

  let Icon = AlertCircle;
  let bgColor = 'bg-red-50';
  let textColor = 'text-red-700';
  let borderColor = 'border-red-200';

  // Customize appearance based on error type
  if (error instanceof NetworkError) {
    Icon = WifiOff;
    bgColor = 'bg-yellow-50';
    textColor = 'text-yellow-700';
    borderColor = 'border-yellow-200';
  } else if (error instanceof ValidationError) {
    Icon = AlertTriangle;
    bgColor = 'bg-orange-50';
    textColor = 'text-orange-700';
    borderColor = 'border-orange-200';
  } else if (error instanceof AuthError) {
    Icon = XCircle;
    bgColor = 'bg-red-50';
    textColor = 'text-red-700';
    borderColor = 'border-red-200';
  }

  return (
    <div className={`${bgColor} border ${borderColor} ${textColor} px-4 py-3 rounded relative`} role="alert">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Icon className="h-5 w-5" />
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium">{error.message}</p>
          {error instanceof AppError && error.debugInfo && import.meta.env.MODE === 'development' && (
            <pre className="mt-2 text-xs overflow-x-auto">
              {JSON.stringify(error.debugInfo, null, 2)}
            </pre>
          )}
        </div>
        {onDismiss && (
          <div className="ml-auto pl-3">
            <button
              onClick={onDismiss}
              className="inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-green-50 focus:ring-green-600"
            >
              <span className="sr-only">Dismiss</span>
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}