import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { PlatformFeature } from '../lib/types/feature';
import { useAuth } from '../contexts/AuthContext';

export function useFeatures() {
  const { hasRole } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeatures = async (): Promise<PlatformFeature[]> => {
    if (!hasRole('administrator')) {
      throw new Error('Unauthorized');
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('platform_features')
        .select('*')
        .order('name');

      if (fetchError) throw fetchError;
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFeature = async (featureId: string, isEnabled: boolean) => {
    if (!hasRole('administrator')) {
      throw new Error('Unauthorized');
    }

    try {
      setError(null);
      const { error: updateError } = await supabase
        .from('platform_features')
        .update({ 
          is_enabled: isEnabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', featureId);

      if (updateError) throw updateError;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  return {
    fetchFeatures,
    toggleFeature,
    isLoading,
    error,
  };
}