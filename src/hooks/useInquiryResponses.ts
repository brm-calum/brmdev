import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { handleError } from '../lib/utils/errors';

export function useInquiryResponses() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendResponse = async (inquiryId: string, message: string): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setIsLoading(true);
      setError(null);

      // Create response
      const { error: responseError } = await supabase
        .from('inquiry_responses')
        .insert({
          inquiry_id: inquiryId,
          sender_id: user.id,
          message: message,
          type: 'message'
        });

      if (responseError) throw responseError;

      // Update inquiry status to show there's a response
      const { error: updateError } = await supabase
        .from('booking_inquiries')
        .update({
          status: 'offer_pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', inquiryId);

      if (updateError) throw updateError;
    } catch (err) {
      const appError = handleError(err, 'sendResponse');
      setError(appError);
      throw appError;
    } finally {
      setIsLoading(false);
    }
  };

  const getResponses = async (inquiryId: string) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: responsesError } = await supabase
        .rpc('get_inquiry_responses', {
          p_inquiry_id: inquiryId
        });

      if (responsesError) throw responsesError;
      return data;
    } catch (err) {
      const appError = handleError(err, 'getResponses');
      setError(appError);
      throw appError;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendResponse,
    getResponses,
    isLoading,
    error
  };
}