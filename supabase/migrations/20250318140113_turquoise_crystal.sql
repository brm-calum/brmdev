/*
  # Fix JSON Handling in Database Functions

  1. Changes
    - Fix JSON handling in save_booking_offer function
    - Add proper JSON validation
    - Add error handling for JSON parsing
    
  2. Security
    - Maintain existing RLS policies
    - No changes to permissions required
*/

-- Update save_booking_offer function to handle JSON properly
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
    'draft'::booking_status
  )
  RETURNING id INTO v_offer_id;

  -- Insert space allocations
  IF p_spaces IS NOT NULL THEN
    FOR v_space IN SELECT * FROM jsonb_array_elements(p_spaces)
    LOOP
      -- Validate required fields
      IF (v_space->>'space_id') IS NULL THEN
        RAISE EXCEPTION 'space_id is required for space allocations';
      END IF;

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
        COALESCE((v_space->>'space_allocated_m2')::numeric, 0),
        COALESCE((v_space->>'price_per_m2_cents')::bigint, 0),
        COALESCE((v_space->>'offer_total_cents')::bigint, 0),
        COALESCE((v_space->>'is_manual_price')::boolean, false),
        v_space->>'comments'
      );
      
      v_space_total := v_space_total + COALESCE((v_space->>'offer_total_cents')::bigint, 0);
    END LOOP;
  END IF;

  -- Insert service allocations if provided
  IF p_services IS NOT NULL THEN
    FOR v_service IN SELECT * FROM jsonb_array_elements(p_services)
    LOOP
      -- Validate required fields
      IF (v_service->>'service_id') IS NULL THEN
        RAISE EXCEPTION 'service_id is required for service allocations';
      END IF;

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
        COALESCE(v_service->>'pricing_type', 'ask_quote'),
        NULLIF((v_service->>'quantity')::numeric, 0),
        NULLIF((v_service->>'price_per_hour_cents')::bigint, 0),
        NULLIF((v_service->>'price_per_unit_cents')::bigint, 0),
        v_service->>'unit_type',
        NULLIF((v_service->>'fixed_price_cents')::bigint, 0),
        COALESCE((v_service->>'offer_total_cents')::bigint, 0),
        v_service->>'comments'
      );
      
      v_services_total := v_services_total + COALESCE((v_service->>'offer_total_cents')::bigint, 0);
    END LOOP;
  END IF;

  -- Insert terms if provided
  IF p_terms IS NOT NULL THEN
    FOR v_term IN SELECT * FROM jsonb_array_elements(p_terms)
    LOOP
      -- Validate required fields
      IF (v_term->>'term_type') IS NULL OR (v_term->>'description') IS NULL THEN
        RAISE EXCEPTION 'term_type and description are required for terms';
      END IF;

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

  -- Create initial offer summary
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
  );

  RETURN v_offer_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.save_booking_offer TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.save_booking_offer IS 'Creates a new booking offer with proper JSON handling and validation';