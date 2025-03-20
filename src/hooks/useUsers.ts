import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserWithProfile } from '../lib/types/user';
import { useAuth } from '../contexts/AuthContext';

export function useUsers() {
  const { hasRole } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async (): Promise<UserWithProfile[]> => {
    if (!hasRole('administrator')) {
      throw new Error('Unauthorized');
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data: users, error: usersError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          is_active,
          created_at,
          updated_at,
          user_roles (
            roles:role_id (
              name
            )
          )
        `);

      if (usersError) throw usersError;

      return users.map((user: any) => ({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        is_active: user.is_active,
        roles: user.user_roles.map((ur: any) => ur.roles.name),
        created_at: user.created_at,
        updated_at: user.updated_at,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const createUser = async (email: string, password: string, roles: string[]) => {
    if (!hasRole('administrator')) {
      throw new Error('Unauthorized');
    }

    try {
      setError(null);
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;
      if (!user) throw new Error('Failed to create user');

      // Get role IDs for the role names
      const { data: roleIds, error: rolesError } = await supabase
        .from('roles')
        .select('id, name')
        .in('name', roles);

      if (rolesError) throw rolesError;

      // Assign roles to the new user
      if (roleIds && roleIds.length > 0) {
        const { error: assignError } = await supabase
          .from('user_roles')
          .insert(roleIds.map(role => ({
            user_id: user.id,
            role_id: role.id
          })));

        if (assignError) throw assignError;
      }

      return user;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const updateUserStatus = async (userId: string, isActive: boolean) => {
    if (!hasRole('administrator')) {
      throw new Error('Unauthorized');
    }

    try {
      setError(null);
      const { error } = await supabase
        .rpc('update_user_status', {
          target_user_id: userId,
          new_status: isActive
        });

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  const updateUserRoles = async (userId: string, roles: string[]): Promise<void> => {
    if (!hasRole('administrator')) {
      throw new Error('Unauthorized');
    }

    try {
      setError(null);

      // Get all available roles first
      const { data: roleIds, error: rolesError } = await supabase
        .from('roles')
        .select('id, name')
        .in('name', roles);

      if (rolesError) throw rolesError;

      if (!roleIds || roleIds.length === 0) {
        throw new Error('No valid roles found');
      }

      // Use RPC function to update roles
      const { error: updateError } = await supabase
        .rpc('update_user_roles', {
          p_user_id: userId,
          p_role_ids: roleIds.map(r => r.id)
        });

      if (updateError) throw updateError;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  return {
    fetchUsers,
    createUser,
    updateUserStatus,
    updateUserRoles,
    isLoading,
    error,
  };
}