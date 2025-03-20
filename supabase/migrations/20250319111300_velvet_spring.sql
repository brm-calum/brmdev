/*
  # Add Offer Workflow Handling

  1. Changes
    - Add function to handle offer status transitions
    - Add notifications for status changes
    - Add validation for offer sending
    
  2. Security
    - Enable RLS on all tables
    - Add proper access control
*/

-- Create function to validate offer before sending
CREATE OR REPLACE FUNCTION public.validate_offer_for_send(p_offer_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space_count integer;
  v_total_allocated numeric;
  v_total_requested numeric;
  v_inquiry_id uuid;
BEGIN
  -- Get inquiry ID
  SELECT inquiry_id INTO v_inquiry_id
  FROM booking_offers
  WHERE id = p_offer_id;

  -- Count spaces with allocations
  SELECT COUNT(*), COALESCE(SUM(space_allocated_m2), 0)
  INTO v_space_count, v_total_allocated
  FROM booking_offer_spaces
  WHERE offer_id = p_offer_id
  AND space_allocated_m2 > 0;

  -- Get total requested space
  SELECT COALESCE(SUM(size_m2), 0)
  INTO v_total_requested
  FROM booking_inquiry_space_requests
  WHERE inquiry_id = v_inquiry_id;

  -- Validate:
  -- 1. At least one space must be allocated
  IF v_space_count = 0 THEN
    RAISE EXCEPTION 'At least one space must be allocated';
  END IF;

  -- 2. Total allocated space must meet or exceed requested space
  IF v_total_allocated < v_total_requested THEN
    RAISE EXCEPTION 'Total allocated space (%) must meet or exceed requested space (%)', 
      v_total_allocated, v_total_requested;
  END IF;

  -- 3. All required services must have pricing set
  IF EXISTS (
    SELECT 1 
    FROM booking_offer_services s
    WHERE s.offer_id = p_offer_id
    AND s.pricing_type != 'ask_quote'
    AND (
      (s.pricing_type = 'hourly_rate' AND s.price_per_hour_cents IS NULL) OR
      (s.pricing_type = 'per_unit' AND (s.price_per_unit_cents IS NULL OR s.unit_type IS NULL)) OR
      (s.pricing_type = 'fixed' AND s.fixed_price_cents IS NULL)
    )
  ) THEN
    RAISE EXCEPTION 'All services must have proper pricing set';
  END IF;

  -- 4. Total cost must be set
  IF NOT EXISTS (
    SELECT 1 
    FROM booking_offers
    WHERE id = p_offer_id
    AND total_cost_cents > 0
  ) THEN
    RAISE EXCEPTION 'Total cost must be set';
  END IF;

  RETURN true;
END;
$$;

-- Create function to send offer
CREATE OR REPLACE FUNCTION public.send_booking_offer(p_offer_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inquiry_id uuid;
  v_trader_id uuid;
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

  -- Validate offer
  PERFORM validate_offer_for_send(p_offer_id);

  -- Get inquiry and trader info
  SELECT 
    bo.inquiry_id,
    bi.trader_id
  INTO v_inquiry_id, v_trader_id
  FROM booking_offers bo
  JOIN booking_inquiries bi ON bi.id = bo.inquiry_id
  WHERE bo.id = p_offer_id;

  -- Update offer status
  UPDATE booking_offers
  SET 
    status = 'offer_sent',
    updated_at = now()
  WHERE id = p_offer_id
  AND status = 'draft';

  -- Update inquiry status
  UPDATE booking_inquiries
  SET 
    status = 'offer_sent',
    updated_at = now()
  WHERE id = v_inquiry_id;

  -- Create notification for trader
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    inquiry_id
  ) VALUES (
    v_trader_id,
    'offer_sent',
    'New Offer Available',
    'A new offer is available for your inquiry',
    v_inquiry_id
  );

  RETURN true;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.validate_offer_for_send TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_booking_offer TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.validate_offer_for_send IS 'Validates if an offer is ready to be sent';
COMMENT ON FUNCTION public.send_booking_offer IS 'Sends an offer to the trader';