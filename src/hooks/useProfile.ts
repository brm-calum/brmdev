import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Profile, ProfileFormData } from '../lib/types/profile';
import { useAuth } from '../contexts/AuthContext';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (fetchError) throw fetchError;
      setProfile(data);
    } catch (err) {
      setError('Failed to fetch profile');
      console.error('Error fetching profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (formData: ProfileFormData) => {
    try {
      setError(null);

      const { error: updateError } = await supabase
        .from('profiles')
        .update(formData)
        .eq('user_id', user?.id);

      if (updateError) throw updateError;
      await fetchProfile();
    } catch (err) {
      setError('Failed to update profile');
      console.error('Error updating profile:', err);
      throw err;
    }
  };

  return {
    profile,
    isLoading,
    error,
    updateProfile,
  };
}