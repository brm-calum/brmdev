import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AuthenticationError, resetPassword } from '../../lib/auth';
import { Mail, Lock } from 'lucide-react';

export function LoginForm() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSuccess(false);
    setIsLoading(true);

    try {
      await signIn(email, password);
    } catch (err) {
      if (err instanceof AuthenticationError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again later.');
        console.error('Login error:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSuccess(false);
    setIsResetting(true);

    try {
      await resetPassword(email);
      setResetSuccess(true);
    } catch (err) {
      if (err instanceof AuthenticationError) {
        setError(err.message);
      } else {
        setError('Failed to send reset password email');
        console.error('Reset password error:', err);
      }
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8">
      <div>
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
          Sign in to your account
        </h2>
      </div>

      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {resetSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
            Password reset email sent. Please check your inbox.
          </div>
        )}

        <div className="space-y-4 rounded-md shadow-sm">
          <div>
            <label htmlFor="email" className="sr-only">Email address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                placeholder="Email address"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="sr-only">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                placeholder="Password"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>

        <div className="mt-4 text-center text-sm space-y-2">
          <div>
            <button
              type="button"
              onClick={() => navigate('/reset-password')}
              className="text-green-600 hover:text-green-700 font-medium"
            >
              Forgot your password?
            </button>
          </div>
          <div>
            <span className="text-gray-600">Don't have an account? </span>
            <Link to="/register" className="text-green-600 hover:text-green-700 font-medium">
              Register here
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}