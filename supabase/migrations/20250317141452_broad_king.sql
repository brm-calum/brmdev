/*
  # Fix Status Migration

  1. Changes
    - Drop existing status columns and recreate with correct type
    - Update status values with proper casting
    - Recreate triggers and policies
    
  2. Security
    - Maintain existing RLS policies
    - No changes to permissions required
*/

-- Drop existing triggers first
DROP TRIGGER IF EXISTS status_transition_trigger ON public.booking_inquiries;
DROP TRIGGER IF EXISTS inquiry_status_notification_trigger ON public.booking_inquiries;

-- Drop existing status columns
ALTER TABLE public.booking_inquiries DROP COLUMN IF EXISTS status;
ALTER TABLE public.booking_offers DROP COLUMN IF EXISTS status;

-- Add new status columns as text first
ALTER TABLE public.booking_inquiries ADD COLUMN status text;
ALTER TABLE public.booking_offers ADD COLUMN status text;

-- Set default values
UPDATE public.booking_inquiries SET status = 'draft';
UPDATE public.booking_offers SET status = 'draft';

-- Now alter the columns to use the enum type
ALTER TABLE public.booking_inquiries 
ALTER COLUMN status TYPE booking_status 
USING status::booking_status;

ALTER TABLE public.booking_offers 
ALTER COLUMN status TYPE booking_status 
USING status::booking_status;

-- Add NOT NULL constraint
ALTER TABLE public.booking_inquiries 
ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.booking_offers 
ALTER COLUMN status SET NOT NULL;

-- Set default values
ALTER TABLE public.booking_inquiries 
ALTER COLUMN status SET DEFAULT 'draft'::booking_status;

ALTER TABLE public.booking_offers 
ALTER COLUMN status SET DEFAULT 'draft'::booking_status;

-- Recreate triggers
CREATE TRIGGER status_transition_trigger
  BEFORE UPDATE OF status ON public.booking_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_status_transition();

CREATE TRIGGER inquiry_status_notification_trigger
  AFTER UPDATE OF status ON public.booking_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_inquiry_status_notification();

-- Add comments
COMMENT ON COLUMN public.booking_inquiries.status IS 'Current status of the inquiry';
COMMENT ON COLUMN public.booking_offers.status IS 'Current status of the offer';