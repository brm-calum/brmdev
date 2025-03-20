/*
  # Update Offer Schema and Functions

  1. Changes
    - Add missing columns to booking_offers table
    - Update booking_offer_spaces table structure
    - Update booking_offer_services table structure
    - Add functions for managing offers consistently
    
  2. Security
    - Maintain existing RLS policies
    - Add proper access control for all functions
*/

-- Update booking_offers table
ALTER TABLE public.booking_offers
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
ADD COLUMN IF NOT EXISTS total_cost_cents bigint NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS valid_until timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
ADD COLUMN IF NOT EXISTS notes text;

-- Update booking_offer_spaces table
ALTER TABLE public.booking_offer_spaces
ADD COLUMN IF NOT EXISTS space_allocated_m2 numeric NOT NULL,
ADD COLUMN IF NOT EXISTS price_per_m2_cents bigint NOT NULL,
ADD COLUMN IF NOT EXISTS offer_total_cents bigint NOT NULL,
ADD COLUMN IF NOT EXISTS is_manual_price boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS comments text;

-- Update booking_offer_services table
ALTER TABLE public.booking_offer_services
ADD COLUMN IF NOT EXISTS pricing_type text NOT NULL CHECK (pricing_type IN ('hourly_rate', 'per_unit', 'fixed', 'ask_quote')),
ADD COLUMN IF NOT EXISTS quantity numeric,
ADD COLUMN IF NOT EXISTS price_per_hour_cents bigint,
ADD COLUMN IF NOT EXISTS price_per_unit_cents bigint,
ADD COLUMN IF NOT EXISTS unit_type text,
ADD COLUMN IF NOT EXISTS fixed_price_cents bigint,
ADD COLUMN IF NOT EXISTS offer_total_cents bigint,
ADD COLUMN IF NOT EXISTS comments text;

-- Create function to save or update offer
CREATE OR REPLACE FUNCTION public.save_booking_offer(
  p_inquiry_id uuid,
  p_total_cost_cents bigint,
  p_valid_until timestamptz,
  p_notes text,
  p_spaces jsonb,
  p_services jsonb DEFAULT NULL,
  p_terms jsonb DEFAULT NULL,
  p_offer_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer_id uuid;
  v_space jsonb;
  v_service jsonb;
  v_term jsonb;
BEGIN
  -- Check if user is administrator
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name = 'administrator'
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Create or update offer
  IF p_offer_id IS NULL THEN
    -- Create new offer
    INSERT INTO public.booking_offers (
      inquiry_id,
      admin_id,
      total_cost_cents,
      valid_until,
      notes,
      status
    ) VALUES (
      p_inquiry_id,
      auth.uid(),
      p_total_cost_cents,
      p_valid_until,
      p_notes,
      'draft'
    )
    RETURNING id INTO v_offer_id;
  ELSE
    -- Update existing offer
    UPDATE public.booking_offers SET
      total_cost_cents = p_total_cost_cents,
      valid_until = p_valid_until,
      notes = p_notes,
      updated_at = now()
    WHERE id = p_offer_id
    RETURNING id INTO v_offer_id;
  END IF;

  -- Delete existing allocations if updating
  IF p_offer_id IS NOT NULL THEN
    DELETE FROM public.booking_offer_spaces WHERE offer_id = v_offer_id;
    DELETE FROM public.booking_offer_services WHERE offer_id = v_offer_id;
    DELETE FROM public.booking_offer_terms WHERE offer_id = v_offer_id;
  END IF;

  -- Insert space allocations
  FOR v_space IN SELECT * FROM jsonb_array_elements(p_spaces)
  LOOP
    INSERT INTO public.booking_offer_spaces (
      offer_id,
      space_id,
      space_allocated_m2,
      price_per_m2_cents,
      offer_total_cents,
      is_manual_price,
      comments
    ) VALUES (
      v_offer_id,
      (v_space->>'space_id')::uuid,
      (v_space->>'space_allocated_m2')::numeric,
      (v_space->>'price_per_m2_cents')::bigint,
      (v_space->>'offer_total_cents')::bigint,
      (v_space->>'is_manual_price')::boolean,
      v_space->>'comments'
    );
  END LOOP;

  -- Insert service allocations if provided
  IF p_services IS NOT NULL THEN
    FOR v_service IN SELECT * FROM jsonb_array_elements(p_services)
    LOOP
      INSERT INTO public.booking_offer_services (
        offer_id,
        service_id,
        pricing_type,
        quantity,
        price_per_hour_cents,
        price_per_unit_cents,
        unit_type,
        fixed_price_cents,
        offer_total_cents,
        comments
      ) VALUES (
        v_offer_id,
        (v_service->>'service_id')::uuid,
        v_service->>'pricing_type',
        (v_service->>'quantity')::numeric,
        (v_service->>'price_per_hour_cents')::bigint,
        (v_service->>'price_per_unit_cents')::bigint,
        v_service->>'unit_type',
        (v_service->>'fixed_price_cents')::bigint,
        (v_service->>'offer_total_cents')::bigint,
        v_service->>'comments'
      );
    END LOOP;
  END IF;

  -- Insert terms if provided
  IF p_terms IS NOT NULL THEN
    FOR v_term IN SELECT * FROM jsonb_array_elements(p_terms)
    LOOP
      INSERT INTO public.booking_offer_terms (
        offer_id,
        term_type,
        description
      ) VALUES (
        v_offer_id,
        v_term->>'term_type',
        v_term->>'description'
      );
    END LOOP;
  END IF;

  RETURN v_offer_id;
END;
$$;

-- Create function to send offer
CREATE OR REPLACE FUNCTION public.send_booking_offer(p_offer_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is administrator
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name = 'administrator'
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Update offer status to sent
  UPDATE public.booking_offers SET
    status = 'sent',
    updated_at = now()
  WHERE id = p_offer_id
  AND status = 'draft';

  RETURN FOUND;
END;
$$;

-- Create function to accept/reject offer
CREATE OR REPLACE FUNCTION public.respond_to_offer(
  p_offer_id uuid,
  p_action text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate action
  IF p_action NOT IN ('accept', 'reject') THEN
    RAISE EXCEPTION 'Invalid action. Must be either accept or reject';
  END IF;

  -- Check if user owns the inquiry
  IF NOT EXISTS (
    SELECT 1 
    FROM booking_offers bo
    JOIN booking_inquiries bi ON bi.id = bo.inquiry_id
    WHERE bo.id = p_offer_id
    AND bi.trader_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Update offer status
  UPDATE public.booking_offers SET
    status = CASE p_action 
      WHEN 'accept' THEN 'accepted'
      WHEN 'reject' THEN 'rejected'
    END,
    updated_at = now()
  WHERE id = p_offer_id
  AND status = 'sent';

  -- Create booking if accepted
  IF p_action = 'accept' AND FOUND THEN
    INSERT INTO public.bookings (
      inquiry_id,
      offer_id,
      status,
      created_at,
      updated_at
    )
    SELECT 
      bo.inquiry_id,
      bo.id,
      'confirmed',
      now(),
      now()
    FROM booking_offers bo
    WHERE bo.id = p_offer_id;
  END IF;

  RETURN FOUND;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.save_booking_offer TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_booking_offer TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_offer TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.save_booking_offer IS 'Creates or updates a booking offer';
COMMENT ON FUNCTION public.send_booking_offer IS 'Sends a draft offer to the customer';
COMMENT ON FUNCTION public.respond_to_offer IS 'Accepts or rejects an offer';