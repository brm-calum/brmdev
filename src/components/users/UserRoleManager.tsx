import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { useUsers } from '../../hooks/useUsers';

interface UserRoleManagerProps {
  userId: string;
  currentRoles: string[];
  onRolesUpdate: () => void;
}

export function UserRoleManager({ userId, currentRoles, onRolesUpdate }: UserRoleManagerProps) {
  const { updateUserRoles } = useUsers();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRoleToggle = async (role: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const newRoles = currentRoles.includes(role)
        ? currentRoles.filter(r => r !== role)
        : [...currentRoles, role];

      await updateUserRoles(userId, newRoles);
      onRolesUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update roles');
    } finally {
      setIsLoading(false);
    }
  };

  const roles = ['customer', 'warehouse_owner', 'administrator'];

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap gap-2">
        {roles.map((role) => (
          <button
            key={role}
            onClick={() => handleRoleToggle(role)}
            disabled={isLoading}
            className={`inline-flex items-center px-2.5 py-1.5 rounded text-xs font-medium
              ${currentRoles.includes(role)
                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              } transition-colors`}
          >
            <Shield className="h-3 w-3 mr-1" />
            {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}