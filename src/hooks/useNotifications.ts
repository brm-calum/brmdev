import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { retryWithBackoff } from '../lib/utils/retry';

const POLL_INTERVAL = 30000; // 30 seconds
const FETCH_TIMEOUT = 5000; // 5 seconds

export function useNotifications() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await retryWithBackoff(
        async () => {
          return await supabase
            .rpc('get_total_unread_count', {
              p_user_id: user.id
            });
        },
        3,
        1000,
        FETCH_TIMEOUT
      );

      if (fetchError) throw fetchError;
      
      if (isMounted.current) {
        setUnreadCount(data || 0);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to fetch unread count');
      }
      console.error('Error fetching unread count:', err);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [user]);

  const setupRealtimeSubscription = useCallback(() => {
    if (!user) return;

    try {
      // Clean up existing subscription
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }

      channelRef.current = supabase
        .channel(`notifications:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'warehouse_inquiries',
            filter: `status=eq.pending`
          },
          () => {
            if (isMounted.current) {
              fetchUnreadCount();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'inquiry_responses',
            filter: `recipient_id=eq.${user.id}`
          },
          () => {
            if (isMounted.current) {
              fetchUnreadCount();
            }
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            console.warn('Notification subscription error, retrying...');
            setTimeout(setupRealtimeSubscription, 1000);
          }
        });
    } catch (err) {
      console.error('Error setting up notification subscription:', err);
      setTimeout(setupRealtimeSubscription, 1000);
    }
  }, [user, fetchUnreadCount]);

  // Set up polling
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    // Initial fetch
    fetchUnreadCount();

    // Set up realtime subscription
    setupRealtimeSubscription();

    // Set up polling interval
    const pollTimer = setInterval(fetchUnreadCount, POLL_INTERVAL);
    
    return () => {
      clearInterval(pollTimer);
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [user, fetchUnreadCount, setupRealtimeSubscription]);

  const markAsRead = async (responseIds: string[]) => {
    if (!user) return;

    if (!responseIds.length) return;

    try {
      const { error } = await supabase.rpc('mark_messages_read', {
        p_response_ids: responseIds,
      });

      if (error) throw error;
      await fetchUnreadCount();
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'Failed to mark messages as read');
        console.error('Error marking messages as read:', err);
      }
      throw err;
    }
  };

  return {
    unreadCount,
    isLoading,
    error,
    markAsRead,
    refresh: fetchUnreadCount
  };
}