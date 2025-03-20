import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AUTH_ERRORS } from '../../lib/errors';
import { AlertCircle } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
}

export function AuthGuard({ 
  children, 
  requiredRoles, 
  fallback = <div>Loading...</div>,
  errorFallback
}: AuthGuardProps) {
  const { user, userRoles, isLoading } = useAuth();

  if (isLoading) {
    return <>{fallback}</>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && !requiredRoles.some(role => userRoles.includes(role))) {
    return errorFallback || (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="flex items-center justify-center text-red-600 mb-4">
              <AlertCircle className="h-12 w-12" />
            </div>
            <h2 className="mt-2 text-center text-2xl font-bold text-gray-900">
              Access Denied
            </h2>
            <p className="mt-4 text-center text-gray-600">
              {AUTH_ERRORS.ROLE_REQUIRED}. Required role: {requiredRoles.join(', ')}
            </p>
            <div className="mt-6">
              <button
                onClick={() => window.history.back()}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}