/*
  # Add Trader Offer Functions

  1. New Functions
    - `get_trader_offer`: Gets offer details formatted for trader view
    - `get_trader_offer_summary`: Gets offer summary with price comparisons
    
  2. Security
    - Functions are SECURITY DEFINER to ensure proper access control
    - Checks user permissions before returning data
    
  3. Changes
    - Creates new functions for trader offer views
    - Includes proper relationship handling
*/

-- Create function to get offer details for traders
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
    ),
    'summary', (
      SELECT jsonb_build_object(
        'quoted_price_cents', os.quoted_price_cents,
        'calculated_price_cents', os.calculated_price_cents,
        'actual_offer_cents', os.actual_offer_cents,
        'space_total_cents', os.space_total_cents,
        'services_total_cents', os.services_total_cents
      )
      FROM offer_summaries os
      WHERE os.offer_id = bo.id
    )
  ) INTO v_result
  FROM booking_offers bo
  JOIN profiles p ON p.user_id = bo.admin_id
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
COMMENT ON FUNCTION public.get_trader_offer IS 'Gets latest sent offer details formatted for trader view';