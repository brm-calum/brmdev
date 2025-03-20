import React, { useEffect, useState } from 'react';
import { useUsers } from '../../hooks/useUsers';
import { UserWithProfile } from '../../lib/types/user';
import { UserX, UserCheck, Loader, Mail, Plus } from 'lucide-react';
import { UserRoleManager } from './UserRoleManager';
import { UserForm } from './UserForm';

export function UserList() {
  const { fetchUsers, updateUserStatus, createUser, isLoading, error } = useUsers();
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    try {
      await updateUserStatus(userId, !currentStatus);
      await loadUsers();
    } catch (err) {
      console.error('Failed to update user status:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
        {error}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </button>
      </div>

      {showCreateForm && (
        <div className="mb-8">
          <UserForm
            onSubmit={async (data) => {
              await createUser(data);
              setShowCreateForm(false);
              loadUsers();
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Email
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Roles
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {user.first_name} {user.last_name}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-500">{user.email}</span>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex flex-wrap gap-2">
                  {user.roles.map((role) => (
                    <button
                      onClick={() => setSelectedUser(user.id)}
                      key={role}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                    >
                      {role}
                    </button>
                  ))}
                </div>
                {selectedUser === user.id && (
                  <UserRoleManager
                    userId={user.id}
                    currentRoles={user.roles}
                    onRolesUpdate={() => {
                      setSelectedUser(null);
                      loadUsers();
                    }}
                  />
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {user.is_active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <button
                  onClick={() => handleStatusToggle(user.id, user.is_active)}
                  className={`inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white ${
                    user.is_active
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-green-600 hover:bg-green-700'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
                >
                  {user.is_active ? (
                    <UserX className="h-5 w-5" />
                  ) : (
                    <UserCheck className="h-5 w-5" />
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}