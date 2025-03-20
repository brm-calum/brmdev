/*
  # Create Inquiry Responses Table

  1. New Tables
    - `inquiry_responses`: Stores responses to inquiries
    
  2. Security
    - Enable RLS
    - Add policies for proper access control
    
  3. Changes
    - Create inquiry_responses table with proper relationships
    - Add RLS policies for access control
*/

-- Create inquiry_responses table
CREATE TABLE public.inquiry_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES public.booking_inquiries(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'message' CHECK (type IN ('message', 'status_change', 'system')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inquiry_responses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view responses for their inquiries"
ON public.inquiry_responses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM booking_inquiries bi
    WHERE bi.id = inquiry_responses.inquiry_id
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

CREATE POLICY "Users can create responses for their inquiries"
ON public.inquiry_responses
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

-- Add indexes
CREATE INDEX inquiry_responses_inquiry_id_idx ON public.inquiry_responses(inquiry_id);
CREATE INDEX inquiry_responses_sender_id_idx ON public.inquiry_responses(sender_id);

-- Add comments
COMMENT ON TABLE public.inquiry_responses IS 'Stores responses and messages for booking inquiries';
COMMENT ON COLUMN public.inquiry_responses.type IS 'Type of response: message, status_change, or system';