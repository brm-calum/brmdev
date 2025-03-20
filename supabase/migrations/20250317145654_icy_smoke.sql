/*
  # Add Update Booking Offer Function

  1. New Functions
    - `update_booking_offer`: Updates an existing offer with new data
    
  2. Security
    - Function is SECURITY DEFINER to ensure proper access control
    - Checks user permissions before updating data
    
  3. Changes
    - Creates a new function to handle offer updates
    - Maintains data integrity through transactions
*/

-- Create function to update booking offer
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
      p_offer_id,
      (v_space->>'space_id')::uuid,
      (v_space->>'space_allocated_m2')::numeric,
      (v_space->>'price_per_m2_cents')::bigint,
      (v_space->>'offer_total_cents')::bigint,
      (v_space->>'is_manual_price')::boolean,
      v_space->>'comments'
    );
    
    v_space_total := v_space_total + (v_space->>'offer_total_cents')::bigint;
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
        p_offer_id,
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
      
      v_services_total := v_services_total + (v_service->>'offer_total_cents')::bigint;
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
        p_offer_id,
        v_term->>'term_type',
        v_term->>'description'
      );
    END LOOP;
  END IF;

  -- Update offer summary
  INSERT INTO offer_summaries (
    offer_id,
    quoted_price_cents,
    calculated_price_cents,
    actual_offer_cents,
    space_total_cents,
    services_total_cents
  ) VALUES (
    p_offer_id,
    p_total_cost_cents,
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
COMMENT ON FUNCTION public.update_booking_offer IS 'Updates an existing booking offer with new data, including spaces, services and terms';