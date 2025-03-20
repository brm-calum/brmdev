/*
  # Fix Status Enum Type

  1. Changes
    - Drop existing enum type
    - Recreate enum with correct values
    - Update status columns with proper casting
    
  2. Security
    - Maintain existing RLS policies
    - No changes to permissions required
*/

-- Drop existing type if it exists
DROP TYPE IF EXISTS public.booking_status CASCADE;

-- Create enum type with all possible values
CREATE TYPE public.booking_status AS ENUM (
  'draft',              -- Initial inquiry state
  'submitted',          -- Inquiry submitted by trader
  'under_review',       -- Admin is reviewing inquiry
  'offer_draft',        -- Admin is preparing offer
  'offer_sent',         -- Offer sent to trader
  'changes_requested',  -- Trader requested changes
  'accepted',          -- Trader accepted offer
  'rejected',          -- Trader rejected offer
  'cancelled',         -- Inquiry/booking cancelled
  'expired',           -- Offer expired
  'confirmed',         -- Booking confirmed
  'completed',         -- Booking completed
  'archived'           -- Archived inquiry/booking
);

-- Create temporary columns with text type
ALTER TABLE public.booking_inquiries 
ADD COLUMN temp_status text;

ALTER TABLE public.booking_offers 
ADD COLUMN temp_status text;

-- Copy existing status values to temporary columns
UPDATE public.booking_inquiries
SET temp_status = status::text;

UPDATE public.booking_offers
SET temp_status = status::text;

-- Drop existing status columns
ALTER TABLE public.booking_inquiries 
DROP COLUMN status;

ALTER TABLE public.booking_offers 
DROP COLUMN status;

-- Add new status columns with enum type
ALTER TABLE public.booking_inquiries 
ADD COLUMN status booking_status;

ALTER TABLE public.booking_offers 
ADD COLUMN status booking_status;

-- Map old status values to new enum values
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

UPDATE public.booking_offers
SET status = CASE temp_status
  WHEN 'draft' THEN 'draft'::booking_status
  WHEN 'sent' THEN 'offer_sent'::booking_status
  WHEN 'accepted' THEN 'accepted'::booking_status
  WHEN 'rejected' THEN 'rejected'::booking_status
  WHEN 'cancelled' THEN 'cancelled'::booking_status
  WHEN 'expired' THEN 'expired'::booking_status
  ELSE 'draft'::booking_status
END;

-- Drop temporary columns
ALTER TABLE public.booking_inquiries 
DROP COLUMN temp_status;

ALTER TABLE public.booking_offers 
DROP COLUMN temp_status;

-- Add NOT NULL constraint
ALTER TABLE public.booking_inquiries 
ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.booking_offers 
ALTER COLUMN status SET NOT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_booking_inquiries_status ON public.booking_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_booking_offers_status ON public.booking_offers(status);

-- Add comments
COMMENT ON TYPE public.booking_status IS 'Unified status type for inquiries and bookings';
COMMENT ON COLUMN public.booking_inquiries.status IS 'Current status of the inquiry/booking';
COMMENT ON COLUMN public.booking_offers.status IS 'Current status of the offer';