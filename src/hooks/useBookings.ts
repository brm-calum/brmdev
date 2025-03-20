import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { handleError, InquiryError, ERROR_MESSAGES, ValidationError } from '../lib/utils/errors';
import { logDebug } from '../lib/utils/debug';

const POLL_INTERVAL = 30000; // 30 seconds
const REALTIME_TIMEOUT = 5000; // 5 seconds

interface InquiryFormData {
  warehouseId: string;
  spaceId: string;
  startDate: Date;
  endDate: Date;
  spaceNeeded: number;
  message: string;
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function useBookings() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const validateInquiry = async (data: InquiryFormData): Promise<ValidationResult> => {
    try {
      if (!data.spaceId) {
        return { isValid: false, error: ERROR_MESSAGES.inquiry.invalidSpace };
      }

      if (!data.spaceId) {
        return { isValid: false, error: ERROR_MESSAGES.inquiry.invalidSpace };
      }

      // Validate warehouse exists and is active
      const { data: warehouse, error: warehouseError } = await supabase
        .from('m_warehouses')
        .select(`
          id, 
          is_active,
          spaces:m_warehouse_spaces(
            id,
            size_m2
          )
        `)
        .eq('id', data.warehouseId)
        .single();

      if (warehouseError || !warehouse) {
        return { isValid: false, error: ERROR_MESSAGES.inquiry.invalidWarehouse };
      }

      if (!warehouse.is_active) {
        return { isValid: false, error: ERROR_MESSAGES.inquiry.warehouseInactive };
      }

      // Validate space exists and belongs to warehouse
      const space = warehouse.spaces?.find(s => s.id === data.spaceId);
      if (!space) {
        return { isValid: false, error: ERROR_MESSAGES.inquiry.invalidSpace };
      }

      // Validate space size
      if (data.spaceNeeded > space.size_m2) {
        return { isValid: false, error: ERROR_MESSAGES.inquiry.invalidSpaceSize };
      }

      // Validate date range
      if (data.endDate < data.startDate) {
        return { isValid: false, error: ERROR_MESSAGES.inquiry.invalidDateRange };
      }

      // Validate message
      if (!data.message.trim()) {
        return { isValid: false, error: ERROR_MESSAGES.inquiry.invalidMessage };
      }

      // Check for duplicate inquiries
      const { data: existingInquiries, error: duplicateError } = await supabase
        .from('m_inquiries')
        .select('id')
        .eq('warehouse_id', data.warehouseId)
        .eq('space_id', data.spaceId)
        .eq('status', 'pending')
        .or(`start_date.lte.${data.endDate},end_date.gte.${data.startDate}`)
        .single();

      if (existingInquiries) {
        return { isValid: false, error: ERROR_MESSAGES.inquiry.duplicateInquiry };
      }

      return { isValid: true };
    } catch (err) {
      logDebug({
        function_name: 'validateInquiry',
        error_message: err instanceof Error ? err.message : 'Unknown error',
        input_params: data
      });
      return { isValid: false, error: ERROR_MESSAGES.inquiry.serverError };
    }
  };
  const fetchInquiries = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: inquiriesError } = await supabase
        .from('m_inquiries')
        .select(`
          *,
          warehouse:m_warehouses(
            id,
            name
          ),
          space:m_warehouse_spaces(
            *,
            space_type:m_space_types(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (inquiriesError) throw inquiriesError;
      
      // Transform data to include space information
      const transformedData = (data || []).map(inquiry => ({
        ...inquiry,
        space_type: inquiry.space?.space_type,
        space_size: inquiry.space?.size_m2
      }));

      setInquiries(transformedData);
    } catch (err) {
      const appError = handleError(err, 'fetchInquiries');
      setError(appError);
      throw appError;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchInquiries();

    // Set up realtime subscription
    const setupRealtimeSubscription = () => {
      try {
        if (channelRef.current) {
          channelRef.current.unsubscribe();
        }

        channelRef.current = supabase
          .channel('inquiries')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'inquiry_responses'
            },
            () => fetchInquiries()
          )
          .subscribe((status) => {
            if (status === 'CHANNEL_ERROR') {
              console.warn('Realtime subscription error, retrying...');
              setTimeout(setupRealtimeSubscription, 1000);
            }
          });
      } catch (err) {
        console.error('Error setting up realtime subscription:', err);
        setTimeout(setupRealtimeSubscription, 1000);
      }
    };

    setupRealtimeSubscription();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, []);

  const createInquiry = async (data: InquiryFormData) => {
    setIsLoading(true);
    setError(null);

    if (!data.spaceId) {
      throw new ValidationError(ERROR_MESSAGES.inquiry.invalidSpace);
    }

    if (!user) {
      throw new InquiryError('You must be logged in to create an inquiry');
    }

    if (!data.warehouseId) {
      throw new InquiryError(ERROR_MESSAGES.inquiry.invalidWarehouse);
    }

    if (!data.spaceId) {
      throw new ValidationError(ERROR_MESSAGES.inquiry.invalidSpace);
    }

    if (!data.spaceId) {
      throw new ValidationError(ERROR_MESSAGES.inquiry.invalidSpace);
    }

    try {
      // Validate inquiry data
      const validation = await validateInquiry(data);
      if (!validation.isValid) {
        throw new InquiryError(validation.error || ERROR_MESSAGES.inquiry.serverError);
      }

      // Create inquiry response
      const { error: inquiryError } = await supabase
        .from('m_inquiries')
        .insert({
          warehouse_id: data.warehouseId,
          space_id: data.spaceId,
          inquirer_id: user.id,
          message: data.message,
          status: 'pending',
          space_needed: data.spaceNeeded,
          start_date: data.startDate.toISOString(),
          end_date: data.endDate.toISOString()
        });

      if (inquiryError) {
        logDebug({
          function_name: 'createInquiry',
          error_message: inquiryError.message,
          input_params: { ...data, user_id: user.id }
        });
        throw new InquiryError(ERROR_MESSAGES.inquiry.serverError, inquiryError);
      }

      // Create initial response
      const { error: responseError } = await supabase
        .from('inquiry_responses')
        .insert({
          warehouse_id: data.warehouseId,
          user_id: user.id,
          message: data.message,
          status: 'pending',
          space_id: data.spaceId,
          space_needed: data.spaceNeeded,
          start_date: data.startDate.toISOString(),
          end_date: data.endDate.toISOString()
        });

      if (responseError) {
        throw new InquiryError(ERROR_MESSAGES.inquiry.serverError, responseError);
      }
    } catch (err) {
      const appError = handleError(err, 'createInquiry');
      setError(appError);
      throw appError;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createInquiry,
    inquiries,
    fetchInquiries,
    isLoading,
    error
  };
}