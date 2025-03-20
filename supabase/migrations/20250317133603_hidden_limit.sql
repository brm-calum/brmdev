/*
  # Fix Status Enum Migration

  1. Changes
    - Drop policies and triggers first
    - Drop view that depends on status column
    - Create new enum type
    - Update columns with proper casting
    - Recreate policies and triggers
    
  2. Security
    - Recreate all policies with proper permissions
    - Maintain existing access control
*/

-- Drop the view first
DROP VIEW IF EXISTS public.booking_inquiries_with_profiles;

-- Drop existing policies
DROP POLICY IF EXISTS "Traders can accept/reject their own offers" ON public.booking_offers;
DROP POLICY IF EXISTS "Traders can view their own offers" ON public.booking_offers;
DROP POLICY IF EXISTS "Administrators can manage offers" ON public.booking_offers;

-- Drop existing triggers
DROP TRIGGER IF EXISTS validate_offer_before_send ON public.booking_offers;
DROP TRIGGER IF EXISTS update_inquiry_status_trigger ON public.booking_offers;

-- Drop existing type
DROP TYPE IF EXISTS public.booking_status CASCADE;

-- Create new enum type
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

-- Create temporary columns
ALTER TABLE public.booking_inquiries 
ADD COLUMN temp_status text;

ALTER TABLE public.booking_offers 
ADD COLUMN temp_status text;

-- Copy existing status values
UPDATE public.booking_inquiries
SET temp_status = status::text;

UPDATE public.booking_offers
SET temp_status = status::text;

-- Drop existing status columns
ALTER TABLE public.booking_inquiries 
DROP COLUMN status;

ALTER TABLE public.booking_offers 
DROP COLUMN status;

-- Add new status columns
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

-- Recreate the view
CREATE OR REPLACE VIEW public.booking_inquiries_with_profiles AS
SELECT 
  bi.*,
  p.first_name AS trader_first_name,
  p.last_name AS trader_last_name,
  p.contact_email AS trader_email,
  p.company_name AS trader_company_name
FROM public.booking_inquiries bi
LEFT JOIN public.profiles p ON bi.trader_id = p.user_id;

-- Recreate policies
CREATE POLICY "Traders can accept/reject their own offers"
ON public.booking_offers
FOR UPDATE
TO authenticated
USING (
  inquiry_id IN (
    SELECT id FROM booking_inquiries
    WHERE trader_id = auth.uid()
  )
)
WITH CHECK (
  status IN ('accepted', 'rejected')
  AND inquiry_id IN (
    SELECT id FROM booking_inquiries
    WHERE trader_id = auth.uid()
  )
);

CREATE POLICY "Traders can view their own offers"
ON public.booking_offers
FOR SELECT
TO authenticated
USING (
  inquiry_id IN (
    SELECT id FROM booking_inquiries
    WHERE trader_id = auth.uid()
  )
);

CREATE POLICY "Administrators can manage offers"
ON public.booking_offers
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name = 'administrator'
  )
);

-- Recreate trigger function for offer validation
CREATE OR REPLACE FUNCTION public.validate_offer_for_send()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the offer is being sent
  IF NEW.status = 'offer_sent'::booking_status THEN
    -- Verify actual_offer_cents is not null
    IF NOT EXISTS (
      SELECT 1 
      FROM offer_summaries os
      WHERE os.offer_id = NEW.id
      AND os.actual_offer_cents IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Cannot send offer: actual_offer_cents must be set';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger function for inquiry status updates
CREATE OR REPLACE FUNCTION public.update_inquiry_status_on_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update inquiry status when offer is sent
  IF NEW.status = 'offer_sent'::booking_status AND OLD.status = 'draft'::booking_status THEN
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

-- Recreate triggers
CREATE TRIGGER validate_offer_before_send
  BEFORE UPDATE ON public.booking_offers
  FOR EACH ROW
  WHEN (OLD.status <> 'offer_sent'::booking_status AND NEW.status = 'offer_sent'::booking_status)
  EXECUTE FUNCTION public.validate_offer_for_send();

CREATE TRIGGER update_inquiry_status_trigger
  AFTER UPDATE OF status ON public.booking_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inquiry_status_on_offer();

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_booking_inquiries_status ON public.booking_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_booking_offers_status ON public.booking_offers(status);

-- Add comments
COMMENT ON TYPE public.booking_status IS 'Unified status type for inquiries and bookings';
COMMENT ON COLUMN public.booking_inquiries.status IS 'Current status of the inquiry/booking';
COMMENT ON COLUMN public.booking_offers.status IS 'Current status of the offer';
COMMENT ON TRIGGER validate_offer_before_send ON public.booking_offers IS 'Enforces actual_offer_cents to be set when sending an offer';
COMMENT ON TRIGGER update_inquiry_status_trigger ON public.booking_offers IS 'Updates inquiry status when offer status changes';