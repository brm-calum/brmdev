import React from 'react';
import { AuthGuard } from '../../components/auth/AuthGuard';
import { ProfileForm } from '../../components/profile/ProfileForm';
import { useProfile } from '../../hooks/useProfile';
import { ProfileFormData } from '../../lib/types/profile';
import { Loader } from 'lucide-react';

export function ProfilePage() {
  const { profile, updateProfile, isLoading, error } = useProfile();

  const handleSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfile(data);
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  return (
    <AuthGuard>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                Profile Settings
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Manage your personal information and preferences
              </p>
            </div>
          </div>

          <div className="mt-8">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="flex justify-center">
                <Loader className="h-8 w-8 animate-spin text-green-600" />
              </div>
            ) : (
              <ProfileForm
                initialData={profile || undefined}
                onSubmit={handleSubmit}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}