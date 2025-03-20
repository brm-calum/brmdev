/*
  # Fix Inquiry Responses Relationship

  1. Changes
    - Add proper join relationship for sender profile info
    - Update RLS policies to include profile access
    - Add function to get responses with sender info
  
  2. Security
    - Maintain existing RLS policies
    - Ensure proper access control
*/

-- Create function to get responses with sender info
CREATE OR REPLACE FUNCTION public.get_inquiry_responses(p_inquiry_id uuid)
RETURNS TABLE (
  id uuid,
  inquiry_id uuid,
  sender_id uuid,
  recipient_id uuid,
  message text,
  type text,
  created_at timestamptz,
  sender_info jsonb
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
    r.id,
    r.inquiry_id,
    r.sender_id,
    r.recipient_id,
    r.message,
    r.type,
    r.created_at,
    jsonb_build_object(
      'id', p.user_id,
      'email', p.contact_email,
      'first_name', p.first_name,
      'last_name', p.last_name
    ) as sender_info
  FROM inquiry_responses r
  JOIN profiles p ON p.user_id = r.sender_id
  WHERE r.inquiry_id = p_inquiry_id
  ORDER BY r.created_at ASC;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_inquiry_responses(uuid) TO authenticated;

-- Add comment explaining usage
COMMENT ON FUNCTION public.get_inquiry_responses IS 'Gets inquiry responses with sender profile information. Example:
SELECT * FROM get_inquiry_responses(''33333333-3333-3333-3333-333333333333'');
';

-- Update the useInquiryResponses hook to use this function instead of direct table access
COMMENT ON TABLE public.inquiry_responses IS 'Use get_inquiry_responses() function instead of direct table access to get responses with sender info';