/*
  # Fix Offer Summaries Table

  1. Changes
    - Make calculated_price_cents nullable
    - Add default values for price columns
    - Update save_offer_allocations function to handle null values
    
  2. Security
    - Maintain existing RLS policies
    - No changes to permissions required
*/

-- Drop existing table and recreate with proper defaults
DROP TABLE IF EXISTS public.offer_summaries CASCADE;

CREATE TABLE public.offer_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.booking_offers(id) ON DELETE CASCADE,
  inquiry_id uuid NOT NULL REFERENCES public.booking_inquiries(id) ON DELETE CASCADE,
  quoted_price_cents bigint NOT NULL DEFAULT 0,
  calculated_price_cents bigint DEFAULT 0,
  actual_offer_cents bigint NOT NULL DEFAULT 0,
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

-- Update create_booking_offer function to handle null values
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
    p_total_cost_cents,
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

-- Add comments
COMMENT ON TABLE public.offer_summaries IS 'Stores offer price summaries with proper defaults';
COMMENT ON COLUMN public.offer_summaries.calculated_price_cents IS 'Calculated total price based on allocations, can be null during draft';
COMMENT ON COLUMN public.offer_summaries.actual_offer_cents IS 'Final offered price, may differ from calculated price';