/*
  # Add Update Booking Inquiry Function

  1. New Functions
    - `update_booking_inquiry`: Updates an existing booking inquiry with new data
    
  2. Security
    - Function is SECURITY DEFINER to ensure proper access control
    - Checks user permissions (must be trader who created inquiry)
    - Only allows updates to editable fields
    
  3. Changes
    - Creates a new function to handle inquiry updates
    - Handles all related tables (warehouses, services, features, space requests)
    - Maintains data integrity through transactions
*/

CREATE OR REPLACE FUNCTION public.update_booking_inquiry(
  p_inquiry_id uuid,
  p_warehouse_ids uuid[],
  p_service_ids uuid[],
  p_feature_ids uuid[],
  p_space_requests jsonb,
  p_start_date timestamp with time zone,
  p_end_date timestamp with time zone,
  p_notes text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trader_id uuid;
  v_space_request jsonb;
  v_estimated_cost bigint;
BEGIN
  -- Get the trader ID to check permissions
  SELECT trader_id INTO v_trader_id
  FROM public.booking_inquiries
  WHERE id = p_inquiry_id;
  
  -- Check if the current user is the owner of the inquiry
  IF v_trader_id != auth.uid() THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  
  -- Start transaction
  BEGIN
    -- Update main inquiry details
    UPDATE public.booking_inquiries
    SET 
      start_date = p_start_date,
      end_date = p_end_date,
      notes = p_notes,
      updated_at = now()
    WHERE id = p_inquiry_id;

    -- Update warehouses
    DELETE FROM public.booking_inquiry_warehouses
    WHERE inquiry_id = p_inquiry_id;
    
    INSERT INTO public.booking_inquiry_warehouses (inquiry_id, warehouse_id)
    SELECT p_inquiry_id, unnest(p_warehouse_ids);

    -- Update services
    DELETE FROM public.booking_inquiry_services
    WHERE inquiry_id = p_inquiry_id;
    
    IF array_length(p_service_ids, 1) > 0 THEN
      INSERT INTO public.booking_inquiry_services (inquiry_id, service_id)
      SELECT p_inquiry_id, unnest(p_service_ids);
    END IF;

    -- Update features
    DELETE FROM public.booking_inquiry_features
    WHERE inquiry_id = p_inquiry_id;
    
    IF array_length(p_feature_ids, 1) > 0 THEN
      INSERT INTO public.booking_inquiry_features (inquiry_id, feature_id)
      SELECT p_inquiry_id, unnest(p_feature_ids);
    END IF;

    -- Update space requests
    DELETE FROM public.booking_inquiry_space_requests
    WHERE inquiry_id = p_inquiry_id;
    
    FOR v_space_request IN SELECT * FROM jsonb_array_elements(p_space_requests)
    LOOP
      INSERT INTO public.booking_inquiry_space_requests(
        inquiry_id,
        space_type_id,
        size_m2
      ) VALUES (
        p_inquiry_id,
        (v_space_request->>'space_type_id')::uuid,
        (v_space_request->>'size_m2')::numeric
      );
    END LOOP;
    
    -- Calculate new estimated cost
    v_estimated_cost := public.estimate_inquiry_cost(p_inquiry_id);
    
    -- Update inquiry with new estimated cost
    UPDATE public.booking_inquiries
    SET estimated_cost_cents = v_estimated_cost
    WHERE id = p_inquiry_id;

    RETURN true;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to update inquiry: %', SQLERRM;
  END;
END;
$$;