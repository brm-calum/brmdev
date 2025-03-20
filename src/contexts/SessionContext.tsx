import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session, SessionState } from '../lib/types/session';
import { useAuth } from './AuthContext';

interface SessionContextType extends SessionState {
  refreshSession: () => Promise<void>;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<SessionState>({
    session: null,
    isLoading: true,
    error: null,
  });

  const refreshSession = async () => {
    if (!user) {
      setState(prev => ({ ...prev, session: null, isLoading: false }));
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Use retryWithBackoff with shorter timeout for session checks
      const { data: sessions, error: fetchError } = await retryWithBackoff(
        () => supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false }),
        3, // max retries
        1000, // initial delay
        3000 // timeout
      );

      if (fetchError) throw fetchError;

      const session = sessions?.[0] || null;

      if (!session) {
        // Create a new session
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

        const { data: newSession, error: createError } = await supabase
          .from('user_sessions')
          .insert({
            user_id: user.id,
            expires_at: expiresAt.toISOString(),
          })
          .select()
          .single();

        if (createError) throw createError;
        setState(prev => ({ ...prev, session: newSession, isLoading: false }));
        return;
      }

      // Update existing session
      try {
        // Update last_seen_at
        const { error: updateError } = await supabase
          .rpc('update_session_last_seen', {
            p_session_id: session.id
          });

        if (updateError) throw updateError;
      } catch (updateErr) {
        console.error('Failed to update last_seen_at:', updateErr);
        // Continue even if update fails
        // Continue even if update fails
      }

      setState(prev => ({ ...prev, session, isLoading: false }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        session: null,
        error: err instanceof Error ? err.message : 'Failed to manage session',
        isLoading: false,
      }));
    }
  };

  const clearSession = () => {
    setState({ session: null, isLoading: false, error: null });
  };

  useEffect(() => {
    refreshSession();
    
    // Set up real-time subscription for session updates
    const subscription = supabase
      .channel('session_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_sessions',
          filter: user ? `user_id=eq.${user.id}` : undefined,
        },
        () => refreshSession()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  return (
    <SessionContext.Provider value={{ ...state, refreshSession, clearSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}