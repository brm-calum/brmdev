/*
  # Fix Booking Status Enum

  1. Changes
    - Drop and recreate booking_status enum with correct values
    - Update existing status values
    - Fix trigger functions
    
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

-- Update existing status values
UPDATE public.booking_inquiries
SET status = CASE status::text
  WHEN 'offer_pending' THEN 'offer_draft'::booking_status
  ELSE status::text::booking_status
END;

UPDATE public.booking_offers
SET status = CASE status::text
  WHEN 'sent' THEN 'offer_sent'::booking_status
  ELSE status::text::booking_status
END;

-- Update trigger function for inquiry status updates
CREATE OR REPLACE FUNCTION public.update_inquiry_status_on_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update inquiry status when offer is sent
  IF NEW.status = 'offer_sent'::booking_status AND OLD.status = 'offer_draft'::booking_status THEN
    UPDATE public.booking_inquiries
    SET 
      status = 'offer_sent'::booking_status,
      updated_at = now()
    WHERE id = NEW.inquiry_id;
  END IF;

  -- Update inquiry status when offer is accepted
  IF NEW.status = 'accepted'::booking_status AND OLD.status = 'offer_sent'::booking_status THEN
    UPDATE public.booking_inquiries
    SET 
      status = 'accepted'::booking_status,
      updated_at = now()
    WHERE id = NEW.inquiry_id;
  END IF;

  -- Update inquiry status when offer is rejected
  IF NEW.status = 'rejected'::booking_status AND OLD.status = 'offer_sent'::booking_status THEN
    UPDATE public.booking_inquiries
    SET 
      status = 'offer_draft'::booking_status,
      updated_at = now()
    WHERE id = NEW.inquiry_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Add comments
COMMENT ON TYPE public.booking_status IS 'Unified status type for inquiries and bookings';