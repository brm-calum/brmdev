/*
  # Add Messaging System

  1. New Tables
    - `booking_messages`: Stores messages between traders and admins
    
  2. Security
    - Enable RLS
    - Add policies for proper access control
    
  3. Changes
    - Add support for in-app messaging
    - Add functions for managing messages
*/

-- Create messages table
CREATE TABLE public.booking_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES public.booking_inquiries(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booking_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view messages for their inquiries"
ON public.booking_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM booking_inquiries bi
    WHERE bi.id = booking_messages.inquiry_id
    AND (
      bi.trader_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid()
        AND r.name = 'administrator'
      )
    )
  )
);

CREATE POLICY "Users can send messages for their inquiries"
ON public.booking_messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM booking_inquiries bi
    WHERE bi.id = inquiry_id
    AND (
      bi.trader_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid()
        AND r.name = 'administrator'
      )
    )
  )
);

-- Create function to get messages
CREATE OR REPLACE FUNCTION public.get_booking_messages(p_inquiry_id uuid)
RETURNS TABLE (
  id uuid,
  inquiry_id uuid,
  sender_id uuid,
  message text,
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
    ) as sender_info
  FROM booking_messages m
  JOIN profiles p ON p.user_id = m.sender_id
  WHERE m.inquiry_id = p_inquiry_id
  ORDER BY m.created_at ASC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_booking_messages TO authenticated;

-- Add comments
COMMENT ON TABLE public.booking_messages IS 'Stores messages between traders and admins';
COMMENT ON FUNCTION public.get_booking_messages IS 'Gets messages for an inquiry with sender information';