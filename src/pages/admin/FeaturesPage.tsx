import React from 'react';
import { AuthGuard } from '../../components/auth/AuthGuard';
import { FeatureList } from '../../components/platform/FeatureList';

export function FeaturesPage() {
  return (
    <AuthGuard requiredRoles={['administrator']}>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Platform Features</h1>
              <p className="mt-2 text-sm text-gray-600">
                Enable or disable platform features and functionalities
              </p>
            </div>
          </div>
          <div className="mt-8">
            <FeatureList />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}