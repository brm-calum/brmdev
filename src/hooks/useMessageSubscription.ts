import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useMessageSubscription(inquiryId: string, onNewMessage: () => void) {
  useEffect(() => {
    // Set up real-time subscription
    const channel = supabase
      .channel(`messages:${inquiryId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'booking_messages',
          filter: `inquiry_id=eq.${inquiryId}`
        },
        () => {
          onNewMessage();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [inquiryId, onNewMessage]);
}