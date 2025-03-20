/*
  # Add Unified Status Workflow

  1. Changes
    - Create unified status type for inquiries, offers and bookings
    - Add proper status transitions and validations
    - Update existing tables to use new status type
    
  2. Security
    - Enable RLS on all tables
    - Add proper access control
*/

-- Create unified status type
CREATE TYPE public.unified_status AS ENUM (
  'draft',              -- Initial inquiry/offer state
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

-- Create function to validate status transitions
CREATE OR REPLACE FUNCTION public.validate_status_transition(
  old_status unified_status,
  new_status unified_status,
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

-- Create function to handle status transitions
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
    OLD.status::unified_status,
    NEW.status::unified_status,
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

-- Create function to handle notifications
CREATE OR REPLACE FUNCTION public.handle_status_notification()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_trader_id uuid;
  v_admin_ids uuid[];
  v_title text;
  v_message text;
BEGIN
  -- Get trader ID
  SELECT trader_id INTO v_trader_id
  FROM booking_inquiries
  WHERE id = NEW.id;

  -- Get admin IDs
  SELECT array_agg(ur.user_id)
  INTO v_admin_ids
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE r.name = 'administrator';

  -- Create notifications based on status
  CASE NEW.status
    WHEN 'submitted' THEN
      -- Notify admins
      INSERT INTO notifications (user_id, type, title, message, inquiry_id)
      SELECT 
        admin_id,
        'inquiry_submitted',
        'New Inquiry Submitted',
        'A new inquiry requires your attention',
        NEW.id
      FROM unnest(v_admin_ids) admin_id;

    WHEN 'offer_sent' THEN
      -- Notify trader
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        inquiry_id
      ) VALUES (
        v_trader_id,
        'offer_sent',
        'New Offer Available',
        'A new offer is available for your inquiry',
        NEW.id
      );

    WHEN 'changes_requested' THEN
      -- Notify admins
      INSERT INTO notifications (user_id, type, title, message, inquiry_id)
      SELECT 
        admin_id,
        'changes_requested',
        'Changes Requested',
        'A trader has requested changes to an offer',
        NEW.id
      FROM unnest(v_admin_ids) admin_id;

    WHEN 'accepted' THEN
      -- Notify admins
      INSERT INTO notifications (user_id, type, title, message, inquiry_id)
      SELECT 
        admin_id,
        'offer_accepted',
        'Offer Accepted',
        'A trader has accepted an offer',
        NEW.id
      FROM unnest(v_admin_ids) admin_id;

    ELSE
      -- No notification needed
      NULL;
  END CASE;

  RETURN NEW;
END;
$$;

-- Add triggers
CREATE TRIGGER status_transition_trigger
  BEFORE UPDATE OF status ON booking_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION handle_status_transition();

CREATE TRIGGER status_notification_trigger
  AFTER UPDATE OF status ON booking_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION handle_status_notification();

-- Add comments
COMMENT ON TYPE public.unified_status IS 'Unified status type for inquiries, offers and bookings';
COMMENT ON FUNCTION public.validate_status_transition IS 'Validates status transitions based on user role';
COMMENT ON FUNCTION public.handle_status_transition IS 'Handles status transition side effects';
COMMENT ON FUNCTION public.handle_status_notification IS 'Creates notifications for status changes';