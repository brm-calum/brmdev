/*
  # Fix JSON Handling in save_booking_offer

  1. Changes
    - Fix JSON handling in save_booking_offer function
    - Add proper type casting for arrays
    - Add validation for JSON inputs
    
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
  p_spaces text, -- Changed from jsonb to text
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

  -- Insert space allocations
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

-- Add comment
COMMENT ON FUNCTION public.save_booking_offer IS 'Creates or updates a booking offer with proper JSON handling';