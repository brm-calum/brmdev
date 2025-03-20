import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthenticationError, resetPassword } from '../../lib/auth';
import { Mail } from 'lucide-react';

export function ResetPasswordForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err) {
      if (err instanceof AuthenticationError) {
        setError(err.message);
      } else {
        setError('Failed to send reset password email');
        console.error('Reset password error:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8">
      <div>
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
          Reset Password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
            <p>Password reset email sent. Please check your inbox.</p>
            <p className="mt-2 text-sm">
              If you don't receive the email within a few minutes, please check your spam folder.
            </p>
          </div>
        )}

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

        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
          >
            Back to Sign In
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </div>
      </form>
    </div>
  );
}