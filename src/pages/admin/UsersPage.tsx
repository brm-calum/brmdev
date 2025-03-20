import React from 'react';
import { AuthGuard } from '../../components/auth/AuthGuard';
import { UserList } from '../../components/users/UserList';
import { Users } from 'lucide-react';

export function UsersPage() {
  return (
    <AuthGuard requiredRoles={['administrator']}>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight flex items-center">
                <Users className="h-8 w-8 text-gray-400 mr-3" />
                User Management
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Manage user accounts, roles, and access permissions
              </p>
            </div>
          </div>
          <div className="mt-8">
            <UserList />
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}