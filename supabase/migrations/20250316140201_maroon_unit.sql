/*
  # Update Offer Space Allocations

  1. Changes
    - Add constraint to ensure offer_price_per_m2_cents is manually set
    - Update save_offer_allocations function to handle null offer prices
    - Add validation to prevent automatic price calculation
  
  2. Security
    - Maintain existing RLS policies
    - Only administrators can manage offer allocations
*/

-- Add check constraint to ensure offer price is manually set
ALTER TABLE public.offer_space_allocations
DROP COLUMN IF EXISTS is_offer_price_manual CASCADE;

ALTER TABLE public.offer_space_allocations
ADD COLUMN is_offer_price_manual boolean NOT NULL DEFAULT false;

-- Update save_offer_allocations function to handle manual offer prices
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

  -- Get inquiry ID and quoted price
  SELECT 
    bi.id, 
    bi.estimated_cost_cents 
  INTO v_inquiry_id, v_quoted_price
  FROM booking_offers bo
  JOIN booking_inquiries bi ON bi.id = bo.inquiry_id
  WHERE bo.id = p_offer_id;

  -- Delete existing allocations
  DELETE FROM offer_space_allocations WHERE offer_id = p_offer_id;
  DELETE FROM offer_service_allocations WHERE offer_id = p_offer_id;
  
  -- Insert space allocations
  FOR v_space IN SELECT * FROM jsonb_array_elements(p_space_allocations)
  LOOP
    -- Only include in total if offer price is manually set
    IF (v_space->>'offer_price_per_m2_cents') IS NOT NULL THEN
      v_space_total := v_space_total + (v_space->>'offer_total_cents')::bigint;
    END IF;

    INSERT INTO offer_space_allocations (
      offer_id,
      space_request_id,
      space_type_id,
      requested_size_m2,
      allocated_size_m2,
      duration_days,
      list_price_per_m2_cents,
      offer_price_per_m2_cents,
      estimated_total_cents,
      offer_total_cents,
      is_offer_price_manual,
      comments
    ) VALUES (
      p_offer_id,
      (v_space->>'space_request_id')::uuid,
      (v_space->>'space_type_id')::uuid,
      (v_space->>'requested_size_m2')::numeric,
      (v_space->>'allocated_size_m2')::numeric,
      (v_space->>'duration_days')::integer,
      (v_space->>'list_price_per_m2_cents')::bigint,
      (v_space->>'offer_price_per_m2_cents')::bigint,
      (v_space->>'estimated_total_cents')::bigint,
      (v_space->>'offer_total_cents')::bigint,
      (v_space->>'offer_price_per_m2_cents') IS NOT NULL,
      v_space->>'comments'
    );
  END LOOP;

  -- Insert service allocations if provided
  IF p_service_allocations IS NOT NULL THEN
    FOR v_service IN SELECT * FROM jsonb_array_elements(p_service_allocations)
    LOOP
      -- Only include in total if offer price is set
      IF (v_service->>'offer_price_cents') IS NOT NULL THEN
        v_services_total := v_services_total + (v_service->>'offer_total_cents')::bigint;
      END IF;

      INSERT INTO offer_service_allocations (
        offer_id,
        service_id,
        pricing_type,
        requested_quantity,
        allocated_quantity,
        duration_days,
        list_price_cents,
        offer_price_cents,
        estimated_total_cents,
        offer_total_cents,
        unit_type,
        comments
      ) VALUES (
        p_offer_id,
        (v_service->>'service_id')::uuid,
        v_service->>'pricing_type',
        (v_service->>'requested_quantity')::numeric,
        (v_service->>'allocated_quantity')::numeric,
        (v_service->>'duration_days')::integer,
        (v_service->>'list_price_cents')::bigint,
        (v_service->>'offer_price_cents')::bigint,
        (v_service->>'estimated_total_cents')::bigint,
        (v_service->>'offer_total_cents')::bigint,
        v_service->>'unit_type',
        v_service->>'comments'
      );
    END LOOP;
  END IF;

  -- Update or insert offer summary
  INSERT INTO offer_summaries (
    offer_id,
    inquiry_id,
    quoted_price_cents,
    calculated_price_cents,
    actual_offer_cents,
    space_total_cents,
    services_total_cents
  ) VALUES (
    p_offer_id,
    v_inquiry_id,
    v_quoted_price,
    v_space_total + v_services_total,
    v_space_total + v_services_total,
    v_space_total,
    v_services_total
  )
  ON CONFLICT (offer_id) DO UPDATE SET
    calculated_price_cents = v_space_total + v_services_total,
    actual_offer_cents = v_space_total + v_services_total,
    space_total_cents = v_space_total,
    services_total_cents = v_services_total,
    updated_at = now();

  RETURN p_offer_id;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.save_offer_allocations IS 'Saves space and service allocations for an offer, with manual offer price handling';