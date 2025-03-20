/*
  # Fix Inquiry Responses Relationships

  1. Changes
    - Drop and recreate inquiry_responses table with proper relationships
    - Preserve existing data
    - Add proper indexes and constraints
    
  2. Security
    - Maintain existing RLS policies
    - Ensure proper access control
*/

-- Backup existing data
CREATE TEMP TABLE inquiry_responses_backup AS
SELECT * FROM inquiry_responses;

-- Drop existing table
DROP TABLE IF EXISTS inquiry_responses CASCADE;

-- Recreate table with proper relationships
CREATE TABLE public.inquiry_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES public.booking_inquiries(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('message', 'offer')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inquiry_responses ENABLE ROW LEVEL SECURITY;

-- Restore data
INSERT INTO inquiry_responses
SELECT * FROM inquiry_responses_backup;

-- Drop temp table
DROP TABLE inquiry_responses_backup;

-- Add indexes
CREATE INDEX inquiry_responses_inquiry_id_idx ON public.inquiry_responses(inquiry_id);
CREATE INDEX inquiry_responses_sender_id_idx ON public.inquiry_responses(sender_id);
CREATE INDEX inquiry_responses_recipient_id_idx ON public.inquiry_responses(recipient_id);

-- Add policies
CREATE POLICY "Admins can manage all responses"
ON public.inquiry_responses
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
    AND r.name = 'administrator'
  )
);

CREATE POLICY "Traders can view responses for their inquiries"
ON public.inquiry_responses
FOR SELECT
TO authenticated
USING (
  inquiry_id IN (
    SELECT id FROM booking_inquiries
    WHERE trader_id = auth.uid()
  )
);

CREATE POLICY "Traders can create responses for their inquiries"
ON public.inquiry_responses
FOR INSERT
TO authenticated
WITH CHECK (
  inquiry_id IN (
    SELECT id FROM booking_inquiries
    WHERE trader_id = auth.uid()
  )
);

-- Add comments
COMMENT ON TABLE public.inquiry_responses IS 'Stores responses and messages for booking inquiries';
COMMENT ON COLUMN public.inquiry_responses.sender_id IS 'The user who sent this response';
COMMENT ON COLUMN public.inquiry_responses.recipient_id IS 'The user who should receive this response';
COMMENT ON COLUMN public.inquiry_responses.type IS 'Type of response: message or offer';