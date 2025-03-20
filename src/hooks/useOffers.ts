import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { handleError } from '../lib/utils/errors';
import { useAuth } from '../contexts/AuthContext';
import { logDebug } from '../lib/utils/debug';

export interface OfferSpace {
  space_id: string; // This is the key field that must match m_warehouse_spaces.id
  space_allocated_m2: number;
  price_per_m2_cents: number;
  offer_total_cents: number;
  is_manual_price?: boolean;
  comments?: string;
}

export interface OfferService {
  service_id: string;
  pricing_type: 'hourly_rate' | 'per_unit' | 'fixed' | 'ask_quote';
  quantity?: number;
  price_per_hour_cents?: number;
  price_per_unit_cents?: number;
  unit_type?: string;
  fixed_price_cents?: number;
  offer_total_cents: number;
  comments?: string;
}

export interface OfferTerm {
  term_type: string;
  description: string;
}

export interface OfferFormData {
  inquiry_id: string;
  total_cost_cents: number;
  valid_until: Date;
  notes?: string;
  spaces: OfferSpace[];
  services?: OfferService[];
  terms?: OfferTerm[];
}

export function useOffers() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getDraftOffer = async (offerId: string) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setIsLoading(true);
      setError(null);

      const { data: offer, error: offerError } = await supabase
        .from('booking_offers')
        .select(`
          *,
          inquiry:inquiry_id(
            id,
            start_date,
            end_date
          ),
          spaces:booking_offer_spaces(
            id,
            space_id,
            space_allocated_m2,
            price_per_m2_cents,
            offer_total_cents,
            is_manual_price,
            comments,
            space:m_warehouse_spaces(
              id,
              warehouse_id,
              space_type_id,
              size_m2,
              price_per_m2_cents,
              space_type:m_space_types(*)
            )
          ),
          services:booking_offer_services(
            id,
            service_id,
            pricing_type,
            quantity,
            price_per_hour_cents,
            price_per_unit_cents,
            unit_type,
            fixed_price_cents,
            offer_total_cents,
            comments,
            service:warehouse_services(
              id,
              name,
              description
            )
          ),
          terms:booking_offer_terms(
            id,
            term_type,
            description
          )
        `)
        .eq('id', offerId)
        .eq('status', 'draft')
        .single();

      if (offerError) throw offerError;

      // Transform the data to match the expected format
      const transformedOffer = {
        inquiry_id: offer.inquiry_id,
        total_cost_cents: offer.total_cost_cents,
        valid_until: offer.valid_until,
        notes: offer.notes,
        spaces: offer.spaces?.map((space: any) => ({
          space_id: space.space_id,
          space_allocated_m2: space.space_allocated_m2,
          price_per_m2_cents: space.price_per_m2_cents,
          offer_total_cents: space.offer_total_cents,
          is_manual_price: space.is_manual_price,
          comments: space.comments,
          space: space.space
        })) || [],
        services: offer.services?.map((service: any) => ({
          service_id: service.service_id,
          pricing_type: service.pricing_type,
          quantity: service.quantity,
          price_per_hour_cents: service.price_per_hour_cents,
          price_per_unit_cents: service.price_per_unit_cents,
          unit_type: service.unit_type,
          fixed_price_cents: service.fixed_price_cents,
          offer_total_cents: service.offer_total_cents,
          comments: service.comments,
          service: service.service
        })) || [],
        terms: offer.terms?.map((term: any) => ({
          term_type: term.term_type,
          description: term.description
        })) || []
      };

      return transformedOffer;
    } catch (err) {
      const appError = handleError(err, 'getDraftOffer');
      setError(appError);
      throw appError;
    } finally {
      setIsLoading(false);
    }
  };

  const saveDraftOffer = async (data: OfferFormData): Promise<string> => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setIsLoading(true);
      setError(null);

      // Log input data for debugging
      logDebug({
        function_name: 'saveDraftOffer',
        input_params: {
          inquiry_id: data.inquiry_id,
          spaces: data.spaces,
          services: data.services,
          terms: data.terms
        }
      });

      // Call RPC function to save offer
      const { data: offerId, error: saveError } = await supabase
        .rpc('save_booking_offer', {
          p_inquiry_id: data.inquiry_id,
          p_total_cost_cents: data.total_cost_cents,
          p_valid_until: data.valid_until.toISOString(),
          p_notes: data.notes,
          p_spaces: data.spaces,
          p_services: data.services || null,
          p_terms: data.terms || null
        });

      if (saveError) throw saveError;
      return offerId;
    } catch (err) {
      const appError = handleError(err, 'saveDraftOffer');
      setError(appError);
      throw appError;
    } finally {
      setIsLoading(false);
    }
  };

  const updateOffer = async (id: string, data: Omit<OfferFormData, 'inquiry_id'>): Promise<boolean> => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setIsLoading(true);
      setError(null);

      // Log input data for debugging
      logDebug({
        function_name: 'updateOffer',
        input_params: {
          offer_id: id,
          spaces: data.spaces,
          services: data.services,
          terms: data.terms
        }
      });

      // Call RPC function to update offer
      const { data: success, error: updateError } = await supabase
        .rpc('update_booking_offer', {
          p_offer_id: id,
          p_total_cost_cents: data.total_cost_cents,
          p_valid_until: data.valid_until.toISOString(),
          p_notes: data.notes,
          p_spaces: data.spaces,
          p_services: data.services || null,
          p_terms: data.terms || null
        });

      if (updateError) throw updateError;
      return success;
    } catch (err) {
      const appError = handleError(err, 'updateOffer');
      setError(appError);
      throw appError;
    } finally {
      setIsLoading(false);
    }
  };

  const sendOffer = async (offerId: string): Promise<boolean> => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setIsLoading(true);
      setError(null);

      // Send offer using the RPC function
      const { data: success, error: sendError } = await supabase
        .rpc('send_booking_offer', {
          p_offer_id: offerId
        });

      if (sendError) throw sendError;
      return success;
    } catch (err) {
      const appError = handleError(err, 'sendOffer');
      setError(appError);
      throw appError;
    } finally {
      setIsLoading(false);
    }
  };

  const acceptOffer = async (offerId: string): Promise<boolean> => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setIsLoading(true);
      setError(null);

      // Accept offer using the RPC function
      const { data: success, error: acceptError } = await supabase
        .rpc('respond_to_offer', {
          p_offer_id: offerId,
          p_action: 'accept'
        });

      if (acceptError) throw acceptError;
      return success;
    } catch (err) {
      const appError = handleError(err, 'acceptOffer');
      setError(appError);
      throw appError;
    } finally {
      setIsLoading(false);
    }
  };

  const rejectOffer = async (offerId: string): Promise<boolean> => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setIsLoading(true);
      setError(null);

      // Reject offer using the RPC function
      const { data: success, error: rejectError } = await supabase
        .rpc('respond_to_offer', {
          p_offer_id: offerId,
          p_action: 'reject'
        });

      if (rejectError) throw rejectError;
      return success;
    } catch (err) {
      const appError = handleError(err, 'rejectOffer');
      setError(appError);
      throw appError;
    } finally {
      setIsLoading(false);
    }
  };

  const getOffersForInquiry = async (inquiryId: string) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      setIsLoading(true);
      setError(null);

      // Get all offers for an inquiry using the RPC function
      const { data: offers, error: offersError } = await supabase
        .rpc('get_booking_offers', {
          p_inquiry_id: inquiryId
        });

      if (offersError) throw offersError;
      return offers;
    } catch (err) {
      const appError = handleError(err, 'getOffersForInquiry');
      setError(appError);
      throw appError;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    saveDraftOffer,
    getDraftOffer,
    updateOffer,
    sendOffer,
    acceptOffer,
    rejectOffer,
    getOffersForInquiry,
    isLoading,
    error
  };
}