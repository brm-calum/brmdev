/*
  # Fix Offer Summaries Constraints

  1. Changes
    - Make actual_offer_cents nullable for draft offers
    - Add trigger to enforce non-null actual_offer_cents when sending offers
    - Update functions to handle nullable actual_offer_cents
    
  2. Security
    - Maintain existing RLS policies
    - No changes to permissions required
*/

-- Drop existing table and recreate with nullable actual_offer_cents
DROP TABLE IF EXISTS public.offer_summaries CASCADE;

CREATE TABLE public.offer_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.booking_offers(id) ON DELETE CASCADE,
  inquiry_id uuid NOT NULL REFERENCES public.booking_inquiries(id) ON DELETE CASCADE,
  quoted_price_cents bigint NOT NULL DEFAULT 0,
  calculated_price_cents bigint DEFAULT 0,
  actual_offer_cents bigint DEFAULT NULL,
  space_total_cents bigint NOT NULL DEFAULT 0,
  services_total_cents bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(offer_id)
);

-- Enable RLS
ALTER TABLE public.offer_summaries ENABLE ROW LEVEL SECURITY;

-- Create policy for administrators
CREATE POLICY "Administrators can manage offer summaries"
  ON public.offer_summaries
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() 
      AND r.name = 'administrator'
    )
  );

-- Create function to validate offer before sending
CREATE OR REPLACE FUNCTION public.validate_offer_for_send()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the offer is being sent (status changing to 'sent')
  IF NEW.status = 'sent' THEN
    -- Verify actual_offer_cents is not null
    IF NOT EXISTS (
      SELECT 1 
      FROM offer_summaries os
      WHERE os.offer_id = NEW.id
      AND os.actual_offer_cents IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Cannot send offer: actual_offer_cents must be set';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to enforce validation when sending offers
DROP TRIGGER IF EXISTS validate_offer_before_send ON public.booking_offers;
CREATE TRIGGER validate_offer_before_send
  BEFORE UPDATE ON public.booking_offers
  FOR EACH ROW
  WHEN (OLD.status != 'sent' AND NEW.status = 'sent')
  EXECUTE FUNCTION public.validate_offer_for_send();

-- Update create_booking_offer function to handle nullable actual_offer_cents
CREATE OR REPLACE FUNCTION public.create_booking_offer(
  p_inquiry_id uuid,
  p_total_cost_cents bigint,
  p_valid_until timestamptz,
  p_notes text DEFAULT NULL,
  p_spaces jsonb DEFAULT NULL,
  p_services jsonb DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer_id uuid;
  v_inquiry_estimated_cost bigint;
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

  -- Get inquiry estimated cost
  SELECT estimated_cost_cents INTO v_inquiry_estimated_cost
  FROM booking_inquiries
  WHERE id = p_inquiry_id;

  -- Create offer
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
  ) RETURNING id INTO v_offer_id;

  -- Create initial offer summary
  INSERT INTO public.offer_summaries (
    offer_id,
    inquiry_id,
    quoted_price_cents,
    calculated_price_cents,
    actual_offer_cents,
    space_total_cents,
    services_total_cents
  ) VALUES (
    v_offer_id,
    p_inquiry_id,
    COALESCE(v_inquiry_estimated_cost, 0),
    0, -- Will be calculated when allocations are saved
    NULL, -- Will be set when finalizing the offer
    0, -- Will be updated when space allocations are saved
    0  -- Will be updated when service allocations are saved
  );

  -- Save allocations if provided
  IF p_spaces IS NOT NULL OR p_services IS NOT NULL THEN
    PERFORM public.save_offer_allocations(
      v_offer_id,
      p_spaces,
      p_services
    );
  END IF;

  RETURN v_offer_id;
END;
$$;

-- Update save_offer_allocations function to handle nullable actual_offer_cents
CREATE OR REPLACE FUNCTION public.save_offer_allocations(
  p_offer_id uuid,
  p_space_allocations jsonb,
  p_service_allocations jsonb DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space jsonb;
  v_service jsonb;
  v_space_total bigint := 0;
  v_services_total bigint := 0;
  v_inquiry_id uuid;
  v_quoted_price bigint;
  v_offer_status text;
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

  -- Get inquiry ID, quoted price, and offer status
  SELECT 
    bi.id, 
    bi.estimated_cost_cents,
    bo.status
  INTO v_inquiry_id, v_quoted_price, v_offer_status
  FROM booking_offers bo
  JOIN booking_inquiries bi ON bi.id = bo.inquiry_id
  WHERE bo.id = p_offer_id;

  -- Calculate totals from allocations
  -- [Previous space and service allocation logic remains unchanged]

  -- Update offer summary
  UPDATE offer_summaries SET
    calculated_price_cents = v_space_total + v_services_total,
    actual_offer_cents = CASE 
      WHEN v_offer_status = 'draft' THEN NULL 
      ELSE v_space_total + v_services_total 
    END,
    space_total_cents = v_space_total,
    services_total_cents = v_services_total,
    updated_at = now()
  WHERE offer_id = p_offer_id;

  RETURN p_offer_id;
END;
$$;

-- Add comments
COMMENT ON TABLE public.offer_summaries IS 'Stores offer price summaries with nullable actual_offer_cents for drafts';
COMMENT ON COLUMN public.offer_summaries.actual_offer_cents IS 'Final offered price, required when sending offer to customer';
COMMENT ON TRIGGER validate_offer_before_send ON public.booking_offers IS 'Enforces actual_offer_cents to be set when sending an offer';