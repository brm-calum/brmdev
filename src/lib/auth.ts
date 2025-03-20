import { AuthError } from '@supabase/supabase-js';
import { supabase } from './supabase';

export async function signOut() {
  try {
    // First clear session
    await supabase.auth.signOut();
    
    // Clear storage after session is cleared
    const keysToKeep = ['supabase-url', 'brm-warehouse-auth'];
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && !keysToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    }
    
    // Clear session storage
    sessionStorage.clear();
  } catch (error) {
    // Log but don't throw - we still want to clear storage
    console.warn('Sign out warning:', error);
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export async function signIn(email: string, password: string) {
  try {
    const { data: { user }, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!user) throw new AuthenticationError('Invalid credentials');

    return user;
  } catch (error) {
    if (error instanceof AuthError) {
      throw new AuthenticationError('Invalid email or password');
    }
    throw error;
  }
}

export async function resetPassword(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
  } catch (error) {
    if (error instanceof AuthError) {
      throw new AuthenticationError('Failed to send reset password email');
    }
    throw error;
  }
}

export async function signUp(email: string, password: string): Promise<{ error?: Error; needsEmailVerification?: boolean }> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      }
    });

    if (error) {
      return { error: new AuthenticationError(error.message) };
    }

    // Email verification is required
    if (data.session === null && data.user) {
      return { needsEmailVerification: true };
    }

    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: new AuthenticationError('Failed to create account') };
    }
    return { error: error instanceof Error ? error : new Error('An unexpected error occurred') };
  }
}