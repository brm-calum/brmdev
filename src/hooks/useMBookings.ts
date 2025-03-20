import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { handleError, InquiryError, ERROR_MESSAGES } from '../lib/utils/errors';
import { logDebug } from '../lib/utils/debug';
import { MInquiry } from '../lib/types/m-warehouse';

interface MInquiryFormData {
  warehouse_id: string;
  space_id: string;
  start_date: Date;
  end_date: Date;
  space_needed: number;
  message: string;
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function useMBookings() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [inquiries, setInquiries] = useState<MInquiry[]>([]);

  const validateInquiry = async (data: MInquiryFormData): Promise<ValidationResult> => {
    try {
      // Validate warehouse exists and is active
      const { data: warehouse, error: warehouseError } = await supabase
        .from('m_warehouses')
        .select('is_active')
        .eq('id', data.warehouse_id)
        .single();

      if (warehouseError) {
        return { isValid: false, error: ERROR_MESSAGES.inquiry.invalidWarehouse };
      }

      if (!warehouse.is_active) {
        return { isValid: false, error: ERROR_MESSAGES.inquiry.warehouseInactive };
      }

      // Validate space exists and belongs to warehouse
      const { data: space, error: spaceError } = await supabase
        .from('m_warehouse_spaces')
        .select('size_m2')
        .eq('id', data.space_id)
        .eq('warehouse_id', data.warehouse_id)
        .single();

      if (spaceError || !space) {
        return { isValid: false, error: ERROR_MESSAGES.inquiry.invalidSpace };
      }

      // Validate space size
      if (data.space_needed > space.size_m2) {
        return { isValid: false, error: ERROR_MESSAGES.inquiry.invalidSpaceSize };
      }

      // Validate date range
      if (data.end_date < data.start_date) {
        return { isValid: false, error: ERROR_MESSAGES.inquiry.invalidDateRange };
      }

      // Validate message
      if (!data.message.trim()) {
        return { isValid: false, error: ERROR_MESSAGES.inquiry.invalidMessage };
      }

      // Check for overlapping bookings
      const { data: overlapping, error: overlapError } = await supabase
        .from('m_inquiries')
        .select('id')
        .eq('space_id', data.space_id)
        .eq('status', 'pending')
        .or(`start_date.lte.${data.end_date},end_date.gte.${data.start_date}`)
        .single();

      if (overlapping) {
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
          warehouse:m_warehouses(*),
          space:m_warehouse_spaces(
            *,
            space_type:m_space_types(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (inquiriesError) throw inquiriesError;
      setInquiries(data || []);
    } catch (err) {
      const appError = handleError(err, 'fetchInquiries');
      setError(appError);
      throw appError;
    } finally {
      setIsLoading(false);
    }
  };

  const createInquiry = async (data: MInquiryFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Validate inquiry data
      const validation = await validateInquiry(data);
      if (!validation.isValid) {
        throw new InquiryError(validation.error || ERROR_MESSAGES.inquiry.serverError);
      }

      // Create inquiry
      const { error: inquiryError } = await supabase
        .from('m_inquiries')
        .insert({
          warehouse_id: data.warehouse_id,
          space_id: data.space_id,
          start_date: data.start_date.toISOString(),
          end_date: data.end_date.toISOString(),
          space_needed: data.space_needed,
          message: data.message
        });

      if (inquiryError) {
        logDebug({
          function_name: 'createInquiry',
          error_message: inquiryError.message,
          input_params: data
        });
        throw new InquiryError(ERROR_MESSAGES.inquiry.serverError, inquiryError);
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