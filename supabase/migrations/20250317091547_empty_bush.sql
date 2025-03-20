/*
  # Fix Offer Tables Structure

  1. Changes
    - Drop unnecessary draft tables
    - Add proper columns to booking_offers
    - Add proper columns to booking_offer_spaces
    - Add proper columns to booking_offer_services
    - Add proper columns to booking_offer_terms
    
  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control
*/

-- Drop unnecessary tables if they exist
DROP TABLE IF EXISTS public.draft_offers CASCADE;
DROP TABLE IF EXISTS public.draft_offer_spaces CASCADE;
DROP TABLE IF EXISTS public.draft_offer_services CASCADE;
DROP TABLE IF EXISTS public.draft_offer_summaries CASCADE;
DROP TABLE IF EXISTS public.offer_space_allocations CASCADE;
DROP TABLE IF EXISTS public.offer_service_allocations CASCADE;
DROP TABLE IF EXISTS public.offer_summaries CASCADE;

-- Update booking_offers table
ALTER TABLE public.booking_offers
ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS total_cost_cents bigint NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS valid_until timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired'));

-- Update booking_offer_spaces table
ALTER TABLE public.booking_offer_spaces
ADD COLUMN IF NOT EXISTS space_allocated_m2 numeric NOT NULL,
ADD COLUMN IF NOT EXISTS price_per_m2_cents bigint NOT NULL,
ADD COLUMN IF NOT EXISTS offer_total_cents bigint NOT NULL,
ADD COLUMN IF NOT EXISTS comments text,
ADD COLUMN IF NOT EXISTS is_manual_price boolean NOT NULL DEFAULT false;

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

-- Update booking_offer_terms table
ALTER TABLE public.booking_offer_terms
ADD COLUMN IF NOT EXISTS term_type text NOT NULL,
ADD COLUMN IF NOT EXISTS description text NOT NULL;

-- Enable RLS
ALTER TABLE public.booking_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_offer_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_offer_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_offer_terms ENABLE ROW LEVEL SECURITY;

-- Create policies for administrators
CREATE POLICY "Administrators can manage offers"
  ON public.booking_offers
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

CREATE POLICY "Administrators can manage offer spaces"
  ON public.booking_offer_spaces
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

CREATE POLICY "Administrators can manage offer services"
  ON public.booking_offer_services
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

CREATE POLICY "Administrators can manage offer terms"
  ON public.booking_offer_terms
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

-- Create policies for traders
CREATE POLICY "Traders can view their own offers"
  ON public.booking_offers
  FOR SELECT
  TO authenticated
  USING (
    inquiry_id IN (
      SELECT id FROM booking_inquiries
      WHERE trader_id = auth.uid()
    )
  );

CREATE POLICY "Traders can view spaces for their offers"
  ON public.booking_offer_spaces
  FOR SELECT
  TO authenticated
  USING (
    offer_id IN (
      SELECT bo.id FROM booking_offers bo
      JOIN booking_inquiries bi ON bi.id = bo.inquiry_id
      WHERE bi.trader_id = auth.uid()
    )
  );

CREATE POLICY "Traders can view services for their offers"
  ON public.booking_offer_services
  FOR SELECT
  TO authenticated
  USING (
    offer_id IN (
      SELECT bo.id FROM booking_offers bo
      JOIN booking_inquiries bi ON bi.id = bo.inquiry_id
      WHERE bi.trader_id = auth.uid()
    )
  );

CREATE POLICY "Traders can view terms for their offers"
  ON public.booking_offer_terms
  FOR SELECT
  TO authenticated
  USING (
    offer_id IN (
      SELECT bo.id FROM booking_offers bo
      JOIN booking_inquiries bi ON bi.id = bo.inquiry_id
      WHERE bi.trader_id = auth.uid()
    )
  );

-- Create function to save offer
CREATE OR REPLACE FUNCTION public.save_booking_offer(
  p_inquiry_id uuid,
  p_total_cost_cents bigint,
  p_valid_until timestamptz,
  p_notes text,
  p_spaces jsonb,
  p_services jsonb DEFAULT NULL,
  p_terms jsonb DEFAULT NULL
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.save_booking_offer TO authenticated;

-- Add comments
COMMENT ON TABLE public.booking_offers IS 'Stores offers for booking inquiries';
COMMENT ON TABLE public.booking_offer_spaces IS 'Stores space allocations for offers';
COMMENT ON TABLE public.booking_offer_services IS 'Stores service allocations for offers';
COMMENT ON TABLE public.booking_offer_terms IS 'Stores terms and conditions for offers';
COMMENT ON FUNCTION public.save_booking_offer IS 'Creates or updates a booking offer with spaces, services and terms';