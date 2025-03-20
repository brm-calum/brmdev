/*
  # Fetch User Inquiries Function

  1. New Functions
    - `fetch_user_inquiries`: Fetches inquiries with all related data for a user
    
  2. Security
    - Function is SECURITY DEFINER to ensure proper access control
    - Checks user permissions (trader or admin)
    - Returns only authorized data

  3. Changes
    - Creates a new function to replace deprecated get_user_inquiries
    - Includes all necessary joins and data transformations
*/

CREATE OR REPLACE FUNCTION public.fetch_user_inquiries()
RETURNS TABLE (
  id uuid,
  trader_id uuid,
  start_date timestamptz,
  end_date timestamptz,
  status text,
  notes text,
  estimated_cost_cents bigint,
  created_at timestamptz,
  updated_at timestamptz,
  trader jsonb,
  space_requests jsonb,
  warehouses jsonb,
  services jsonb,
  features jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    bi.id,
    bi.trader_id,
    bi.start_date,
    bi.end_date,
    bi.status::text,
    bi.notes,
    bi.estimated_cost_cents,
    bi.created_at,
    bi.updated_at,
    -- Trader info
    jsonb_build_object(
      'id', p.user_id,
      'email', p.contact_email,
      'first_name', p.first_name,
      'last_name', p.last_name,
      'company_name', p.company_name
    ) AS trader,
    -- Space requests
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', sr.id,
            'space_type_id', sr.space_type_id,
            'size_m2', sr.size_m2,
            'space_type', jsonb_build_object(
              'id', st.id,
              'name', st.name,
              'description', st.description
            )
          )
        )
        FROM booking_inquiry_space_requests sr
        JOIN m_space_types st ON st.id = sr.space_type_id
        WHERE sr.inquiry_id = bi.id
      ),
      '[]'::jsonb
    ) AS space_requests,
    -- Warehouses
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'warehouse_id', w.id,
            'warehouse', jsonb_build_object(
              'id', w.id,
              'name', w.name,
              'city', w.city,
              'country', w.country,
              'spaces', (
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'id', s.id,
                    'space_type_id', s.space_type_id,
                    'size_m2', s.size_m2,
                    'price_per_m2_cents', s.price_per_m2_cents,
                    'space_type', jsonb_build_object(
                      'id', st.id,
                      'name', st.name
                    )
                  )
                )
                FROM m_warehouse_spaces s
                JOIN m_space_types st ON st.id = s.space_type_id
                WHERE s.warehouse_id = w.id
              )
            )
          )
        )
        FROM booking_inquiry_warehouses biw
        JOIN m_warehouses w ON w.id = biw.warehouse_id
        WHERE biw.inquiry_id = bi.id
      ),
      '[]'::jsonb
    ) AS warehouses,
    -- Services
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'service_id', s.id,
            'service', jsonb_build_object(
              'id', s.id,
              'name', s.name,
              'description', s.description
            )
          )
        )
        FROM booking_inquiry_services bis
        JOIN warehouse_services s ON s.id = bis.service_id
        WHERE bis.inquiry_id = bi.id
      ),
      '[]'::jsonb
    ) AS services,
    -- Features
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'feature_id', f.id,
            'feature', jsonb_build_object(
              'id', f.id,
              'name', f.name,
              'type', f.type
            )
          )
        )
        FROM booking_inquiry_features bif
        JOIN warehouse_features f ON f.id = bif.feature_id
        WHERE bif.inquiry_id = bi.id
      ),
      '[]'::jsonb
    ) AS features
  FROM booking_inquiries bi
  JOIN profiles p ON p.user_id = bi.trader_id
  WHERE 
    -- User can see their own inquiries
    bi.trader_id = auth.uid()
    -- Or user is an administrator
    OR EXISTS (
      SELECT 1 
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() 
      AND r.name = 'administrator'
    )
  ORDER BY bi.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.fetch_user_inquiries() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.fetch_user_inquiries() IS 'Fetches all inquiries with related data that the current user has access to';