import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';
import { retryWithBackoff } from './utils/retry';
import { handleError } from './utils/errors';

// Validate environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client with auto refresh and persistent sessions
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storageKey: 'brm-warehouse-auth',
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'x-application-name': 'brm-warehouse',
    },
    fetch: (url, options) => retryWithBackoff(() => fetchWithTimeout(url, options))
  },
});

// Create custom fetch with timeout
const fetchWithTimeout = (url: string, options: RequestInit = {}, timeout = 5000) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ]) as Promise<Response>;
};

// Handle auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
    // Clear any cached data
    localStorage.removeItem('supabase-auth-token');
    
    // Force reload to clear all state
    window.location.reload();
  }

  if (event === 'TOKEN_REFRESHED' && !session) {
    handleError(new Error('Session expired'), 'auth');
  }
});