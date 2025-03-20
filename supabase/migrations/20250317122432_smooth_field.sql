/*
  # Add Get Trader Offer Function

  1. New Functions
    - `get_trader_offer`: Gets offer details formatted for trader view
    
  2. Security
    - Function is SECURITY DEFINER to ensure proper access control
    - Checks user permissions before returning data
    
  3. Changes
    - Creates a new function to handle trader offer retrieval
    - Returns all required offer details in a single query
*/

CREATE OR REPLACE FUNCTION public.get_trader_offer(p_inquiry_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Check if user owns the inquiry
  IF NOT EXISTS (
    SELECT 1 
    FROM booking_inquiries bi
    WHERE bi.id = p_inquiry_id
    AND bi.trader_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Get latest sent offer for this inquiry
  SELECT jsonb_build_object(
    'id', bo.id,
    'inquiry_id', bo.inquiry_id,
    'inquiry_number', substring(bo.inquiry_id::text from 1 for 8),
    'status', bo.status,
    'total_cost_cents', bo.total_cost_cents,
    'valid_until', bo.valid_until,
    'notes', bo.notes,
    'created_at', bo.created_at,
    'updated_at', bo.updated_at,
    'admin', jsonb_build_object(
      'first_name', p.first_name,
      'last_name', p.last_name
    ),
    'inquiry', jsonb_build_object(
      'start_date', bi.start_date,
      'end_date', bi.end_date
    ),
    'spaces', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'space_allocated_m2', s.space_allocated_m2,
          'price_per_m2_cents', s.price_per_m2_cents,
          'offer_total_cents', s.offer_total_cents,
          'comments', s.comments,
          'space', jsonb_build_object(
            'id', ws.id,
            'space_type', jsonb_build_object(
              'id', st.id,
              'name', st.name
            ),
            'warehouse', jsonb_build_object(
              'id', w.id,
              'name', w.name,
              'city', w.city,
              'country', w.country
            )
          )
        )
      )
      FROM booking_offer_spaces s
      JOIN m_warehouse_spaces ws ON ws.id = s.space_id
      JOIN m_space_types st ON st.id = ws.space_type_id
      JOIN m_warehouses w ON w.id = ws.warehouse_id
      WHERE s.offer_id = bo.id
    ),
    'services', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'service', jsonb_build_object(
            'id', ws.id,
            'name', ws.name
          ),
          'pricing_type', s.pricing_type,
          'quantity', s.quantity,
          'price_per_hour_cents', s.price_per_hour_cents,
          'price_per_unit_cents', s.price_per_unit_cents,
          'unit_type', s.unit_type,
          'fixed_price_cents', s.fixed_price_cents,
          'offer_total_cents', s.offer_total_cents,
          'comments', s.comments
        )
      )
      FROM booking_offer_services s
      JOIN warehouse_services ws ON ws.id = s.service_id
      WHERE s.offer_id = bo.id
    )
  ) INTO v_result
  FROM booking_offers bo
  JOIN profiles p ON p.user_id = bo.admin_id
  JOIN booking_inquiries bi ON bi.id = bo.inquiry_id
  WHERE bo.inquiry_id = p_inquiry_id
  AND bo.status = 'sent'
  ORDER BY bo.created_at DESC
  LIMIT 1;

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_trader_offer TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_trader_offer IS 'Gets latest sent offer details formatted for trader view, including inquiry number, warehouse, date range, spaces, services, notes, total price and valid until date';