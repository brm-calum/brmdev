/*
  # Fix Status Type Casting

  1. Changes
    - Add temporary status mapping
    - Update status columns safely
    - Preserve existing data
    
  2. Security
    - Maintain existing RLS policies
    - No changes to permissions required
*/

-- First create the enum type
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
ADD COLUMN temp_status booking_status;

ALTER TABLE public.booking_offers 
ADD COLUMN temp_status booking_status;

-- Update temporary columns with mapped values
UPDATE public.booking_inquiries
SET temp_status = CASE status
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
SET temp_status = CASE status
  WHEN 'draft' THEN 'draft'::booking_status
  WHEN 'sent' THEN 'offer_sent'::booking_status
  WHEN 'accepted' THEN 'accepted'::booking_status
  WHEN 'rejected' THEN 'rejected'::booking_status
  WHEN 'cancelled' THEN 'cancelled'::booking_status
  WHEN 'expired' THEN 'expired'::booking_status
  ELSE 'draft'::booking_status
END;

-- Drop old status columns
ALTER TABLE public.booking_inquiries 
DROP COLUMN status;

ALTER TABLE public.booking_offers 
DROP COLUMN status;

-- Rename temporary columns
ALTER TABLE public.booking_inquiries 
RENAME COLUMN temp_status TO status;

ALTER TABLE public.booking_offers 
RENAME COLUMN temp_status TO status;

-- Add NOT NULL constraint
ALTER TABLE public.booking_inquiries 
ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.booking_offers 
ALTER COLUMN status SET NOT NULL;

-- Create function to validate status transitions
CREATE OR REPLACE FUNCTION public.validate_status_transition(
  old_status booking_status,
  new_status booking_status,
  is_admin boolean
) RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- If no status change, always valid
  IF old_status = new_status THEN
    RETURN true;
  END IF;

  -- Admin transitions
  IF is_admin THEN
    CASE old_status
      WHEN 'submitted' THEN
        RETURN new_status IN ('under_review', 'cancelled');
      WHEN 'under_review' THEN
        RETURN new_status IN ('offer_draft', 'cancelled');
      WHEN 'offer_draft' THEN
        RETURN new_status IN ('offer_sent', 'cancelled');
      WHEN 'changes_requested' THEN
        RETURN new_status IN ('offer_draft', 'cancelled');
      WHEN 'accepted' THEN
        RETURN new_status IN ('confirmed', 'cancelled');
      WHEN 'confirmed' THEN
        RETURN new_status IN ('completed', 'cancelled');
      WHEN 'completed' THEN
        RETURN new_status = 'archived';
      ELSE
        RETURN false;
    END CASE;
  END IF;

  -- Trader transitions
  CASE old_status
    WHEN 'draft' THEN
      RETURN new_status IN ('submitted', 'cancelled');
    WHEN 'offer_sent' THEN
      RETURN new_status IN ('accepted', 'rejected', 'changes_requested');
    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- Create trigger function to handle status transitions
CREATE OR REPLACE FUNCTION public.handle_status_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  -- Check if user is administrator
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name = 'administrator'
  ) INTO v_is_admin;

  -- Validate transition
  IF NOT public.validate_status_transition(
    OLD.status,
    NEW.status,
    v_is_admin
  ) THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;

  -- Handle status-specific actions
  CASE NEW.status
    WHEN 'offer_sent' THEN
      -- Set expiry date for offer
      NEW.valid_until := CURRENT_TIMESTAMP + interval '7 days';
    WHEN 'expired' THEN
      -- Clear any pending actions
      NEW.valid_until := NULL;
    ELSE
      -- No special handling needed
  END CASE;

  -- Update timestamp
  NEW.updated_at := CURRENT_TIMESTAMP;
  
  RETURN NEW;
END;
$$;

-- Add trigger to booking_inquiries
DROP TRIGGER IF EXISTS status_transition_trigger ON booking_inquiries;
CREATE TRIGGER status_transition_trigger
  BEFORE UPDATE OF status ON booking_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_status_transition();

-- Add indexes for status columns
CREATE INDEX idx_booking_inquiries_status ON public.booking_inquiries(status);
CREATE INDEX idx_booking_offers_status ON public.booking_offers(status);

-- Add comments
COMMENT ON TYPE public.booking_status IS 'Unified status type for inquiries and bookings';
COMMENT ON FUNCTION public.validate_status_transition IS 'Validates status transitions based on user role';
COMMENT ON FUNCTION public.handle_status_transition IS 'Handles status transition side effects';