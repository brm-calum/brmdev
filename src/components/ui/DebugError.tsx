import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface DebugErrorProps {
  error: Error;
  debugInfo?: any;
}

export function DebugError({ error, debugInfo }: DebugErrorProps) {
  const isDev = import.meta.env.MODE === 'development';

  if (!isDev) {
    return null;
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
        <div>
          <h3 className="text-sm font-medium text-red-800">Debug Error</h3>
          <div className="mt-2 text-sm text-red-700">
            <p className="font-medium">{error.message}</p>
            {error.stack && (
              <pre className="mt-2 text-xs overflow-x-auto whitespace-pre-wrap">
                {error.stack}
              </pre>
            )}
            {debugInfo && (
              <div className="mt-2">
                <p className="font-medium">Debug Info:</p>
                <pre className="mt-1 text-xs overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}