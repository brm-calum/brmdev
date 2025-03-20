/*
  # Add Offer Summaries Table

  1. New Tables
    - `offer_summaries`: Stores calculated totals for offers
    
  2. Security
    - Enable RLS
    - Add policies for administrator access
    
  3. Changes
    - Add support for tracking offer totals
    - Add proper relationships and constraints
*/

-- Create offer summaries table
CREATE TABLE public.offer_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.booking_offers(id) ON DELETE CASCADE,
  quoted_price_cents bigint NOT NULL DEFAULT 0,
  calculated_price_cents bigint NOT NULL DEFAULT 0,
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

-- Create policy for traders to view their summaries
CREATE POLICY "Traders can view their offer summaries"
  ON public.offer_summaries
  FOR SELECT
  TO authenticated
  USING (
    offer_id IN (
      SELECT bo.id FROM booking_offers bo
      JOIN booking_inquiries bi ON bi.id = bo.inquiry_id
      WHERE bi.trader_id = auth.uid()
    )
  );

-- Update save_booking_offer function to handle summaries
CREATE OR REPLACE FUNCTION public.save_booking_offer(
  p_inquiry_id uuid,
  p_total_cost_cents bigint,
  p_valid_until timestamptz,
  p_notes text,
  p_spaces text,
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
  v_space record;
  v_service jsonb;
  v_term jsonb;
  v_spaces jsonb;
  v_space_total bigint := 0;
  v_services_total bigint := 0;
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

  -- Parse spaces JSON
  BEGIN
    v_spaces := p_spaces::jsonb;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid JSON for spaces';
  END;

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

    -- Delete existing allocations
    DELETE FROM public.booking_offer_spaces WHERE offer_id = v_offer_id;
    DELETE FROM public.booking_offer_services WHERE offer_id = v_offer_id;
    DELETE FROM public.booking_offer_terms WHERE offer_id = v_offer_id;
  END IF;

  -- Insert space allocations and calculate total
  FOR v_space IN 
    SELECT * FROM jsonb_to_recordset(v_spaces) AS x(
      space_id uuid,
      space_allocated_m2 numeric,
      price_per_m2_cents bigint,
      offer_total_cents bigint,
      is_manual_price boolean,
      comments text
    )
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
      v_space.space_id,
      v_space.space_allocated_m2,
      v_space.price_per_m2_cents,
      v_space.offer_total_cents,
      COALESCE(v_space.is_manual_price, false),
      v_space.comments
    );
    
    v_space_total := v_space_total + v_space.offer_total_cents;
  END LOOP;

  -- Insert service allocations and calculate total
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
      
      v_services_total := v_services_total + COALESCE((v_service->>'offer_total_cents')::bigint, 0);
    END LOOP;
  END IF;

  -- Insert or update offer summary
  INSERT INTO public.offer_summaries (
    offer_id,
    quoted_price_cents,
    calculated_price_cents,
    actual_offer_cents,
    space_total_cents,
    services_total_cents
  ) VALUES (
    v_offer_id,
    COALESCE(v_inquiry_estimated_cost, 0),
    v_space_total + v_services_total,
    p_total_cost_cents,
    v_space_total,
    v_services_total
  )
  ON CONFLICT (offer_id) DO UPDATE SET
    calculated_price_cents = v_space_total + v_services_total,
    actual_offer_cents = p_total_cost_cents,
    space_total_cents = v_space_total,
    services_total_cents = v_services_total,
    updated_at = now();

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
COMMENT ON TABLE public.offer_summaries IS 'Stores calculated totals for offers';
COMMENT ON FUNCTION public.save_booking_offer IS 'Creates or updates a booking offer with proper summary calculation';