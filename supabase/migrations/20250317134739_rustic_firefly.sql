/*
  # Add Message Read Status Tracking

  1. Changes
    - Add read_status table to track message read status per user
    - Add function to mark messages as read
    - Add function to get unread message count
    
  2. Security
    - Enable RLS on read_status table
    - Add policies for proper access control
*/

-- Create read status table
CREATE TABLE public.message_read_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.booking_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS
ALTER TABLE public.message_read_status ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own read status"
  ON public.message_read_status
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION public.mark_messages_read(
  p_message_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert read status for each message
  INSERT INTO public.message_read_status (message_id, user_id)
  SELECT unnest(p_message_ids), auth.uid()
  ON CONFLICT (message_id, user_id) DO NOTHING;
END;
$$;

-- Function to get unread message count
CREATE OR REPLACE FUNCTION public.get_unread_message_count(
  p_user_id uuid
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count bigint;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM public.booking_messages m
  WHERE 
    -- Message is not from the current user
    m.sender_id != p_user_id
    -- Message is in an inquiry the user has access to
    AND EXISTS (
      SELECT 1 FROM booking_inquiries bi
      WHERE bi.id = m.inquiry_id
      AND (
        bi.trader_id = p_user_id
        OR EXISTS (
          SELECT 1 FROM user_roles ur
          JOIN roles r ON r.id = ur.role_id
          WHERE ur.user_id = p_user_id
          AND r.name = 'administrator'
        )
      )
    )
    -- Message hasn't been read
    AND NOT EXISTS (
      SELECT 1 FROM message_read_status rs
      WHERE rs.message_id = m.id
      AND rs.user_id = p_user_id
    );

  RETURN v_count;
END;
$$;

-- Update get_booking_messages to include read status
CREATE OR REPLACE FUNCTION public.get_booking_messages(p_inquiry_id uuid)
RETURNS TABLE (
  id uuid,
  inquiry_id uuid,
  sender_id uuid,
  message text,
  created_at timestamptz,
  sender_info jsonb,
  is_read boolean
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
    m.id,
    m.inquiry_id,
    m.sender_id,
    m.message,
    m.created_at,
    jsonb_build_object(
      'id', p.user_id,
      'email', p.contact_email,
      'first_name', p.first_name,
      'last_name', p.last_name,
      'is_admin', EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = m.sender_id
        AND r.name = 'administrator'
      )
    ) as sender_info,
    EXISTS (
      SELECT 1 FROM message_read_status rs
      WHERE rs.message_id = m.id
      AND rs.user_id = auth.uid()
    ) as is_read
  FROM booking_messages m
  JOIN profiles p ON p.user_id = m.sender_id
  WHERE m.inquiry_id = p_inquiry_id
  ORDER BY m.created_at ASC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.mark_messages_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_message_count TO authenticated;

-- Add comments
COMMENT ON TABLE public.message_read_status IS 'Tracks which messages have been read by which users';
COMMENT ON FUNCTION public.mark_messages_read IS 'Marks messages as read for the current user';
COMMENT ON FUNCTION public.get_unread_message_count IS 'Gets count of unread messages for a user';