/*
  # Add Notification System

  1. New Tables
    - `notifications`: Stores notifications for users
    - `notification_preferences`: Stores user notification preferences
    
  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control
    
  3. Changes
    - Add functions to create notifications
    - Add trigger for inquiry status changes
*/

-- Create notification type enum
CREATE TYPE public.notification_type AS ENUM (
  'inquiry_submitted',
  'inquiry_under_review',
  'offer_draft',
  'offer_sent',
  'changes_requested',
  'inquiry_accepted',
  'inquiry_rejected',
  'inquiry_cancelled',
  'inquiry_expired',
  'booking_confirmed',
  'booking_completed'
);

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  inquiry_id uuid REFERENCES public.booking_inquiries(id) ON DELETE CASCADE,
  read boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create notification preferences table
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled boolean DEFAULT true,
  push_enabled boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage their notification preferences"
  ON public.notification_preferences
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_status_notification(
  p_inquiry_id uuid,
  p_new_status booking_status
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inquiry record;
  v_trader_name text;
  v_admin_name text;
  v_warehouse_name text;
  v_title text;
  v_message text;
  v_admin_ids uuid[];
BEGIN
  -- Get inquiry details
  SELECT 
    bi.*,
    CONCAT(p.first_name, ' ', p.last_name) as trader_name,
    w.name as warehouse_name
  INTO v_inquiry
  FROM booking_inquiries bi
  JOIN profiles p ON p.user_id = bi.trader_id
  LEFT JOIN booking_inquiry_warehouses biw ON biw.inquiry_id = bi.id
  LEFT JOIN m_warehouses w ON w.id = biw.warehouse_id
  WHERE bi.id = p_inquiry_id;

  -- Get admin IDs
  SELECT array_agg(ur.user_id)
  INTO v_admin_ids
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE r.name = 'administrator';

  -- Prepare notification content
  CASE p_new_status
    WHEN 'submitted' THEN
      -- Notify admins
      v_title := 'New Inquiry Submitted';
      v_message := CONCAT(
        v_inquiry.trader_name, ' has submitted a new inquiry for warehouse "',
        v_inquiry.warehouse_name, '"'
      );
      
      -- Create notification for each admin
      INSERT INTO notifications (user_id, type, title, message, inquiry_id)
      SELECT 
        admin_id,
        'inquiry_submitted'::notification_type,
        v_title,
        v_message,
        p_inquiry_id
      FROM unnest(v_admin_ids) admin_id;

    WHEN 'under_review' THEN
      -- Notify trader
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        inquiry_id
      ) VALUES (
        v_inquiry.trader_id,
        'inquiry_under_review'::notification_type,
        'Inquiry Under Review',
        'Your inquiry is now being reviewed by our team',
        p_inquiry_id
      );

    WHEN 'offer_sent' THEN
      -- Notify trader
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        inquiry_id
      ) VALUES (
        v_inquiry.trader_id,
        'offer_sent'::notification_type,
        'New Offer Available',
        'A new offer is available for your inquiry',
        p_inquiry_id
      );

    WHEN 'changes_requested' THEN
      -- Notify admins
      v_title := 'Changes Requested';
      v_message := CONCAT(
        v_inquiry.trader_name, ' has requested changes to the offer for warehouse "',
        v_inquiry.warehouse_name, '"'
      );
      
      INSERT INTO notifications (user_id, type, title, message, inquiry_id)
      SELECT 
        admin_id,
        'changes_requested'::notification_type,
        v_title,
        v_message,
        p_inquiry_id
      FROM unnest(v_admin_ids) admin_id;

    WHEN 'accepted' THEN
      -- Notify admins
      v_title := 'Offer Accepted';
      v_message := CONCAT(
        v_inquiry.trader_name, ' has accepted the offer for warehouse "',
        v_inquiry.warehouse_name, '"'
      );
      
      INSERT INTO notifications (user_id, type, title, message, inquiry_id)
      SELECT 
        admin_id,
        'inquiry_accepted'::notification_type,
        v_title,
        v_message,
        p_inquiry_id
      FROM unnest(v_admin_ids) admin_id;

    WHEN 'rejected' THEN
      -- Notify admins
      v_title := 'Offer Rejected';
      v_message := CONCAT(
        v_inquiry.trader_name, ' has rejected the offer for warehouse "',
        v_inquiry.warehouse_name, '"'
      );
      
      INSERT INTO notifications (user_id, type, title, message, inquiry_id)
      SELECT 
        admin_id,
        'inquiry_rejected'::notification_type,
        v_title,
        v_message,
        p_inquiry_id
      FROM unnest(v_admin_ids) admin_id;

    ELSE
      -- No notification needed
      NULL;
  END CASE;
END;
$$;

-- Create trigger for status changes
CREATE OR REPLACE FUNCTION public.handle_inquiry_status_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only create notification if status has changed
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM create_status_notification(NEW.id, NEW.status);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add trigger to booking_inquiries
CREATE TRIGGER inquiry_status_notification_trigger
  AFTER UPDATE OF status ON public.booking_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_inquiry_status_notification();

-- Add indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read) WHERE NOT read;
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);

-- Add comments
COMMENT ON TABLE public.notifications IS 'Stores user notifications';
COMMENT ON TABLE public.notification_preferences IS 'Stores user notification preferences';
COMMENT ON FUNCTION public.create_status_notification IS 'Creates notifications for inquiry status changes';
COMMENT ON FUNCTION public.handle_inquiry_status_notification IS 'Trigger function to handle inquiry status notifications';