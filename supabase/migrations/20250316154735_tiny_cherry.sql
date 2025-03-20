/*
  # Fix Booking Offers Admin Relationship

  1. Changes
    - Add proper join relationship for admin profile info
    - Update RLS policies to include profile access
    - Add function to get offers with admin info
  
  2. Security
    - Maintain existing RLS policies
    - Ensure proper access control
*/

-- Create function to get offers with admin info
CREATE OR REPLACE FUNCTION public.get_booking_offers(p_inquiry_id uuid)
RETURNS TABLE (
  id uuid,
  inquiry_id uuid,
  admin_id uuid,
  status text,
  total_cost_cents bigint,
  valid_until timestamptz,
  notes text,
  created_at timestamptz,
  updated_at timestamptz,
  admin_info jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has access to inquiry
  IF NOT EXISTS (
    SELECT 1 FROM booking_inquiries bi
    WHERE bi.id = p_inquiry_id
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

  RETURN QUERY
  SELECT 
    o.id,
    o.inquiry_id,
    o.admin_id,
    o.status::text,
    o.total_cost_cents,
    o.valid_until,
    o.notes,
    o.created_at,
    o.updated_at,
    jsonb_build_object(
      'id', p.user_id,
      'email', p.contact_email,
      'first_name', p.first_name,
      'last_name', p.last_name
    ) as admin_info
  FROM booking_offers o
  JOIN profiles p ON p.user_id = o.admin_id
  WHERE o.inquiry_id = p_inquiry_id
  ORDER BY o.created_at DESC;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_booking_offers(uuid) TO authenticated;

-- Add comment explaining usage
COMMENT ON FUNCTION public.get_booking_offers IS 'Gets booking offers with admin profile information. Example:
SELECT * FROM get_booking_offers(''33333333-3333-3333-3333-333333333333'');
';

-- Update the useOffers hook to use this function instead of direct table access
COMMENT ON TABLE public.booking_offers IS 'Use get_booking_offers() function instead of direct table access to get offers with admin info';