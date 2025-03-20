/*
  # Fix Offer Access Permissions

  1. Changes
    - Add proper permission checks for get_offer_with_relationships function
    - Add policies for traders to view their own offers
    - Fix function to handle both admin and trader access
    
  2. Security
    - Maintain existing RLS policies
    - Add proper access control checks
*/

-- Drop existing function
DROP FUNCTION IF EXISTS public.get_offer_with_relationships(uuid);

-- Create updated function with proper permissions
CREATE OR REPLACE FUNCTION public.get_offer_with_relationships(p_offer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_is_admin boolean;
  v_can_access boolean;
  v_inquiry_id uuid;
BEGIN
  -- Check if user is administrator
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name = 'administrator'
  ) INTO v_is_admin;

  -- Get inquiry ID for this offer
  SELECT inquiry_id INTO v_inquiry_id
  FROM booking_offers
  WHERE id = p_offer_id;

  -- Check if user owns the inquiry
  SELECT EXISTS (
    SELECT 1 
    FROM booking_inquiries bi
    WHERE bi.id = v_inquiry_id
    AND (
      bi.trader_id = auth.uid() OR
      v_is_admin = true
    )
  ) INTO v_can_access;

  IF NOT v_can_access THEN
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
      FROM booking_offer_spaces s
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
  WHERE bo.id = p_offer_id;

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_offer_with_relationships TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_offer_with_relationships IS 'Gets complete offer details with proper access control';