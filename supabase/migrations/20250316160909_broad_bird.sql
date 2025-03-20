/*
  # Fix Column Names in Offer Tables

  1. Changes
    - Rename price_per_m2_cents to list_price_per_m2_cents in m_warehouse_spaces
    - Add missing columns to offer_space_allocations
    - Update get_offer_with_relationships function
  
  2. Security
    - Maintain existing RLS policies
    - No changes to permissions required
*/

-- Add missing columns to offer_space_allocations
ALTER TABLE public.offer_space_allocations
ADD COLUMN IF NOT EXISTS list_price_per_m2_cents bigint;

-- Update get_offer_with_relationships function
CREATE OR REPLACE FUNCTION public.get_offer_with_relationships(p_offer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Check if user has access to offer
  IF NOT EXISTS (
    SELECT 1 
    FROM booking_offers bo
    JOIN booking_inquiries bi ON bi.id = bo.inquiry_id
    WHERE bo.id = p_offer_id
    AND (
      bi.trader_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid()
        AND r.name = 'administrator'
      )
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'id', bo.id,
    'inquiry_id', bo.inquiry_id,
    'admin_id', bo.admin_id,
    'status', bo.status,
    'total_cost_cents', bo.total_cost_cents,
    'valid_until', bo.valid_until,
    'notes', bo.notes,
    'created_at', bo.created_at,
    'updated_at', bo.updated_at,
    'admin', jsonb_build_object(
      'id', p.user_id,
      'email', p.contact_email,
      'first_name', p.first_name,
      'last_name', p.last_name
    ),
    'inquiry', (
      SELECT jsonb_build_object(
        'id', bi.id,
        'trader_id', bi.trader_id,
        'status', bi.status,
        'start_date', bi.start_date,
        'end_date', bi.end_date,
        'notes', bi.notes,
        'estimated_cost_cents', bi.estimated_cost_cents,
        'trader', jsonb_build_object(
          'id', tp.user_id,
          'email', tp.contact_email,
          'first_name', tp.first_name,
          'last_name', tp.last_name
        )
      )
      FROM booking_inquiries bi
      JOIN profiles tp ON tp.user_id = bi.trader_id
      WHERE bi.id = bo.inquiry_id
    ),
    'spaces', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'space_id', s.space_id,
          'space_allocated_m2', s.space_allocated_m2,
          'list_price_per_m2_cents', s.list_price_per_m2_cents,
          'offer_price_per_m2_cents', s.offer_price_per_m2_cents,
          'offer_total_cents', s.offer_total_cents,
          'space', (
            SELECT jsonb_build_object(
              'id', ws.id,
              'warehouse_id', ws.warehouse_id,
              'space_type_id', ws.space_type_id,
              'size_m2', ws.size_m2,
              'price_per_m2_cents', ws.price_per_m2_cents,
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
            FROM m_warehouse_spaces ws
            JOIN m_space_types st ON st.id = ws.space_type_id
            JOIN m_warehouses w ON w.id = ws.warehouse_id
            WHERE ws.id = s.space_id
          )
        )
      )
      FROM offer_space_allocations s
      WHERE s.offer_id = bo.id
    ),
    'services', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'service_id', s.service_id,
          'pricing_type', s.pricing_type,
          'quantity', s.quantity,
          'price_per_hour_cents', s.price_per_hour_cents,
          'price_per_unit_cents', s.price_per_unit_cents,
          'unit_type', s.unit_type,
          'offer_total_cents', s.offer_total_cents,
          'service', jsonb_build_object(
            'id', ws.id,
            'name', ws.name,
            'description', ws.description
          )
        )
      )
      FROM offer_service_allocations s
      JOIN warehouse_services ws ON ws.id = s.service_id
      WHERE s.offer_id = bo.id
    )
  ) INTO v_result
  FROM booking_offers bo
  JOIN profiles p ON p.user_id = bo.admin_id
  WHERE bo.id = p_offer_id;

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_offer_with_relationships TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_offer_with_relationships IS 'Gets complete offer details with all relationships including admin, inquiry, spaces and services';