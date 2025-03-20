import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { BookingInquiry, InquiryFormData } from '../lib/types/inquiry';
import { useAuth } from '../contexts/AuthContext';
import { handleError } from '../lib/utils/errors';

export function useInquiries() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [inquiries, setInquiries] = useState<BookingInquiry[]>([]);

  const fetchInquiries = async (): Promise<BookingInquiry[]> => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setIsLoading(true);
      setError(null);

      // Use the new fetch_user_inquiries function
      const { data, error: fetchError } = await supabase
        .rpc('fetch_user_inquiries');

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err) {
      const appError = handleError(err, 'fetchInquiries');
      setError(appError);
      throw appError;
    } finally {
      setIsLoading(false);
    }
  };

  const createInquiry = async (formData: InquiryFormData): Promise<string> => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setIsLoading(true);
      setError(null);

      // Call RPC function to create inquiry
      const { data: inquiryId, error: createError } = await supabase
        .rpc('create_booking_inquiry', {
          p_trader_id: user.id,
          p_warehouse_ids: formData.warehouse_ids,
          p_service_ids: formData.service_ids,
          p_feature_ids: formData.feature_ids,
          p_space_requests: formData.space_requests,
          p_start_date: formData.start_date.toISOString(),
          p_end_date: formData.end_date.toISOString(),
          p_notes: formData.notes
        });

      if (createError) throw createError;
      return inquiryId;
    } catch (err) {
      const appError = handleError(err, 'createInquiry');
      setError(appError);
      throw appError;
    } finally {
      setIsLoading(false);
    }
  };

  const submitInquiry = async (inquiryId: string): Promise<boolean> => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setIsLoading(true);
      setError(null);

      const { data: success, error: submitError } = await supabase
        .rpc('submit_booking_inquiry', {
          p_inquiry_id: inquiryId
        });

      if (submitError) throw submitError;
      return success;
    } catch (err) {
      const appError = handleError(err, 'submitInquiry');
      setError(appError);
      throw appError;
    } finally {
      setIsLoading(false);
    }
  };

  const getInquiry = async (id: string) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setIsLoading(true);
      setError(null);

      // Get all inquiries and find the specific one
      const inquiries = await fetchInquiries();
      const inquiry = inquiries.find(i => i.id === id);
      
      if (!inquiry) throw new Error('Inquiry not found');
      return inquiry;
    } catch (err) {
      const appError = handleError(err, 'getInquiry');
      setError(appError);
      throw appError;
    } finally {
      setIsLoading(false);
    }
  };

  const updateInquiry = async (id: string, formData: InquiryFormData): Promise<void> => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setIsLoading(true);
      setError(null);

      // Start a transaction
      const { error: updateError } = await supabase.rpc('update_booking_inquiry', {
        p_inquiry_id: id,
        p_warehouse_ids: formData.warehouse_ids,
        p_service_ids: formData.service_ids,
        p_feature_ids: formData.feature_ids,
        p_space_requests: formData.space_requests,
        p_start_date: formData.start_date.toISOString(),
        p_end_date: formData.end_date.toISOString(),
        p_notes: formData.notes
      });

      if (updateError) throw updateError;
    } catch (err) {
      const appError = handleError(err, 'updateInquiry');
      setError(appError);
      throw appError;
    } finally {
      setIsLoading(false);
    }
  };

  const canEdit = (status: string): boolean => {
    return ['draft', 'submitted', 'offer_pending', 'offer_sent'].includes(status);
  };

  return {
    inquiries,
    fetchInquiries,
    createInquiry,
    submitInquiry,
    getInquiry,
    updateInquiry,
    canEdit,
    isLoading,
    error,
  };
}