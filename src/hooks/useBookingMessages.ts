import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { handleError } from '../lib/utils/errors';
import { useEffect, useState } from 'react';

export function useBookingMessages() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadUnreadCount();
      
      // Subscribe to new messages
      const channel = supabase
        .channel('messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'booking_messages'
          },
          () => {
            loadUnreadCount();
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [user]);

  const loadUnreadCount = async () => {
    try {
      const { data: count, error: countError } = await supabase
        .rpc('get_unread_message_count', { p_user_id: user.id });

      if (countError) throw countError;
      setUnreadCount(count || 0);
    } catch (err) {
      console.error('Failed to load unread count:', err);
    }
  };

  const getMessages = async (inquiryId: string) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setIsLoading(true);
      setError(null);

      const { data: messages, error: messagesError } = await supabase
        .rpc('get_booking_messages', { p_inquiry_id: inquiryId });

      if (messagesError) throw messagesError;
      return messages || [];
    } catch (err) {
      const appError = handleError(err, 'getMessages');
      setError(appError);
      throw appError;
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (inquiryId: string, message: string) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setIsLoading(true);
      setError(null);

      const { error: sendError } = await supabase
        .from('booking_messages')
        .insert({
          inquiry_id: inquiryId,
          sender_id: user.id,
          message
        });

      if (sendError) throw sendError;
    } catch (err) {
      const appError = handleError(err, 'sendMessage');
      setError(appError);
      throw appError;
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (messageIds: string[]) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      const { error: markError } = await supabase
        .rpc('mark_messages_read', { p_message_ids: messageIds });

      if (markError) throw markError;
      await loadUnreadCount();
    } catch (err) {
      const appError = handleError(err, 'markAsRead');
      setError(appError);
      throw appError;
    }
  };

  return {
    getMessages,
    sendMessage,
    markAsRead,
    unreadCount,
    isLoading,
    error
  };
}