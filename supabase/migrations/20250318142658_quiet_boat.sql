/*
  # Fix Space ID Validation

  1. Changes
    - Add debug logging for space ID validation
    - Add more detailed error messages
    - Fix space ID validation logic
    
  2. Security
    - Maintain existing RLS policies
    - No changes to permissions required
*/

-- Create function to log debug info
CREATE OR REPLACE FUNCTION public.log_offer_debug(
  p_function_name text,
  p_input_params jsonb,
  p_error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO debug_logs (
    function_name,
    input_params,
    error_message,
    created_at
  ) VALUES (
    p_function_name,
    p_input_params,
    p_error_message,
    now()
  );
END;
$$;

-- Update save_booking_offer function with improved validation
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
  v_space_exists boolean;
  v_space_id uuid;
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
      -- Log space data for debugging
      PERFORM log_offer_debug(
        'save_booking_offer',
        jsonb_build_object(
          'space_data', v_space,
          'space_id', v_space->>'space_id'
        )
      );

      -- Validate required fields
      IF (v_space->>'space_id') IS NULL THEN
        RAISE EXCEPTION 'space_id is required for space allocations';
      END IF;

      -- Parse and validate space_id
      BEGIN
        v_space_id := (v_space->>'space_id')::uuid;
      EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid space_id format: %', v_space->>'space_id';
      END;

      -- Check if space exists
      SELECT EXISTS (
        SELECT 1 
        FROM m_warehouse_spaces 
        WHERE id = v_space_id
      ) INTO v_space_exists;

      IF NOT v_space_exists THEN
        -- Log error details
        PERFORM log_offer_debug(
          'save_booking_offer',
          jsonb_build_object(
            'space_id', v_space_id,
            'validation_failed', true
          ),
          format('Space with ID %s does not exist', v_space_id)
        );
        
        RAISE EXCEPTION 'Space with ID % does not exist', v_space_id;
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
        v_space_id,
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

-- Update update_booking_offer function with improved validation
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
  v_space_id uuid;
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
      -- Log space data for debugging
      PERFORM log_offer_debug(
        'update_booking_offer',
        jsonb_build_object(
          'space_data', v_space,
          'space_id', v_space->>'space_id'
        )
      );

      -- Validate required fields
      IF (v_space->>'space_id') IS NULL THEN
        RAISE EXCEPTION 'space_id is required for space allocations';
      END IF;

      -- Parse and validate space_id
      BEGIN
        v_space_id := (v_space->>'space_id')::uuid;
      EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Invalid space_id format: %', v_space->>'space_id';
      END;

      -- Check if space exists
      SELECT EXISTS (
        SELECT 1 
        FROM m_warehouse_spaces 
        WHERE id = v_space_id
      ) INTO v_space_exists;

      IF NOT v_space_exists THEN
        -- Log error details
        PERFORM log_offer_debug(
          'update_booking_offer',
          jsonb_build_object(
            'space_id', v_space_id,
            'validation_failed', true
          ),
          format('Space with ID %s does not exist', v_space_id)
        );
        
        RAISE EXCEPTION 'Space with ID % does not exist', v_space_id;
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
        v_space_id,
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.log_offer_debug TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_booking_offer TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_booking_offer TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.log_offer_debug IS 'Logs debug information for offer operations';
COMMENT ON FUNCTION public.save_booking_offer IS 'Creates a new booking offer with improved space validation';
COMMENT ON FUNCTION public.update_booking_offer IS 'Updates an existing booking offer with improved space validation';