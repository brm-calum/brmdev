/*
  # Update Booking Offer Function

  1. Changes
    - Add proper validation for space_id and service_id
    - Add clear error messages
    - Add proper NULL handling
    - Match validation with save_booking_offer function
    
  2. Security
    - Maintain existing RLS policies
    - No changes to permissions required
*/

-- Update the update_booking_offer function
CREATE OR REPLACE FUNCTION public.update_booking_offer(
  p_offer_id uuid,
  p_total_cost_cents bigint,
  p_valid_until timestamptz,
  p_notes text,
  p_spaces jsonb,
  p_services jsonb DEFAULT NULL,
  p_terms jsonb DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space jsonb;
  v_service jsonb;
  v_term jsonb;
  v_space_total bigint := 0;
  v_services_total bigint := 0;
  v_space_exists boolean;
  v_inquiry_id uuid;
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

  -- Get inquiry ID and estimated cost
  SELECT bi.id, bi.estimated_cost_cents 
  INTO v_inquiry_id, v_inquiry_estimated_cost
  FROM booking_offers bo
  JOIN booking_inquiries bi ON bi.id = bo.inquiry_id
  WHERE bo.id = p_offer_id;

  -- Update offer
  UPDATE public.booking_offers SET
    total_cost_cents = p_total_cost_cents,
    valid_until = p_valid_until,
    notes = p_notes,
    updated_at = now()
  WHERE id = p_offer_id;

  -- Delete existing allocations
  DELETE FROM public.booking_offer_spaces WHERE offer_id = p_offer_id;
  DELETE FROM public.booking_offer_services WHERE offer_id = p_offer_id;
  DELETE FROM public.booking_offer_terms WHERE offer_id = p_offer_id;

  -- Insert space allocations
  IF p_spaces IS NOT NULL THEN
    FOR v_space IN SELECT * FROM jsonb_array_elements(p_spaces)
    LOOP
      -- Validate required fields
      IF (v_space->>'space_id') IS NULL THEN
        RAISE EXCEPTION 'space_id is required for space allocations';
      END IF;

      -- Check if space exists
      SELECT EXISTS (
        SELECT 1 
        FROM m_warehouse_spaces 
        WHERE id = (v_space->>'space_id')::uuid
      ) INTO v_space_exists;

      IF NOT v_space_exists THEN
        RAISE EXCEPTION 'Space with ID % does not exist', (v_space->>'space_id');
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
        p_offer_id,
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

      -- Check if service exists
      IF NOT EXISTS (
        SELECT 1 
        FROM warehouse_services 
        WHERE id = (v_service->>'service_id')::uuid
      ) THEN
        RAISE EXCEPTION 'Service with ID % does not exist', (v_service->>'service_id');
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
        p_offer_id,
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
        p_offer_id,
        v_term->>'term_type',
        v_term->>'description'
      );
    END LOOP;
  END IF;

  -- Update offer summary
  INSERT INTO public.offer_summaries (
    offer_id,
    quoted_price_cents,
    calculated_price_cents,
    actual_offer_cents,
    space_total_cents,
    services_total_cents
  ) VALUES (
    p_offer_id,
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

  RETURN true;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_booking_offer TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.update_booking_offer IS 'Updates an existing booking offer with proper validation of space and service IDs';