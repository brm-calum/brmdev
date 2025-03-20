/*
  # Fix Status Migration with View Handling

  1. Changes
    - Drop view first to remove dependency
    - Create temporary column for status
    - Update data with proper casting
    - Recreate view with new status type
    
  2. Security
    - Maintain existing RLS policies
    - No changes to permissions required
*/

-- First drop the view that depends on the status column
DROP VIEW IF EXISTS public.booking_inquiries_with_profiles;

-- Create temporary column
ALTER TABLE public.booking_inquiries 
ADD COLUMN temp_status text;

-- Copy current status values
UPDATE public.booking_inquiries 
SET temp_status = status::text;

-- Drop the status column
ALTER TABLE public.booking_inquiries 
DROP COLUMN status;

-- Add new status column with enum type
ALTER TABLE public.booking_inquiries 
ADD COLUMN status booking_status;

-- Update with mapped values
UPDATE public.booking_inquiries
SET status = CASE temp_status
  WHEN 'draft' THEN 'draft'::booking_status
  WHEN 'submitted' THEN 'submitted'::booking_status
  WHEN 'under_review' THEN 'under_review'::booking_status
  WHEN 'offer_pending' THEN 'offer_draft'::booking_status
  WHEN 'offer_sent' THEN 'offer_sent'::booking_status
  WHEN 'accepted' THEN 'accepted'::booking_status
  WHEN 'rejected' THEN 'rejected'::booking_status
  WHEN 'cancelled' THEN 'cancelled'::booking_status
  WHEN 'expired' THEN 'expired'::booking_status
  ELSE 'draft'::booking_status
END;

-- Drop temporary column
ALTER TABLE public.booking_inquiries 
DROP COLUMN temp_status;

-- Add NOT NULL constraint
ALTER TABLE public.booking_inquiries 
ALTER COLUMN status SET NOT NULL;

-- Set default value
ALTER TABLE public.booking_inquiries 
ALTER COLUMN status SET DEFAULT 'draft'::booking_status;

-- Recreate the view with the new status type
CREATE OR REPLACE VIEW public.booking_inquiries_with_profiles AS
SELECT 
  bi.*,
  p.first_name AS trader_first_name,
  p.last_name AS trader_last_name,
  p.contact_email AS trader_email,
  p.company_name AS trader_company_name
FROM public.booking_inquiries bi
LEFT JOIN public.profiles p ON bi.trader_id = p.user_id;

-- Add comment
COMMENT ON COLUMN public.booking_inquiries.status IS 'Current status of the inquiry';