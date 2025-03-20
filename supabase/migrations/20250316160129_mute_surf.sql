/*
  # Refresh Schema Cache and Add Helper Functions

  1. Changes
    - Add helper functions for fetching offers with relationships
    - Add function to validate offer access
    - Add function to get offer details
    
  2. Security
    - Maintain existing RLS policies
    - Add proper access checks in functions
*/

-- Function to validate offer access
CREATE OR REPLACE FUNCTION public.validate_offer_access(p_offer_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
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
  );
END;
$$;

-- Function to get offer details
CREATE OR REPLACE FUNCTION public.get_offer_details(p_offer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Check access
  IF NOT public.validate_offer_access(p_offer_id) THEN
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
    'spaces', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'space_id', s.space_id,
          'space_allocated_m2', s.space_allocated_m2,
          'price_per_m2_cents', s.price_per_m2_cents,
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
              )
            )
            FROM m_warehouse_spaces ws
            JOIN m_space_types st ON st.id = ws.space_type_id
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.validate_offer_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_offer_details TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.validate_offer_access IS 'Validates if the current user has access to view/modify an offer';
COMMENT ON FUNCTION public.get_offer_details IS 'Gets complete offer details with all relationships';