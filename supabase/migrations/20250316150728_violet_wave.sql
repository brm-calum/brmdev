/*
  # Fix Booking Offers Admin Relationship

  1. Changes
    - Add admin_id column to booking_offers table
    - Add foreign key constraint to auth.users
    - Update create_booking_offer function to include admin_id
  
  2. Security
    - Maintain existing RLS policies
    - Add validation for administrator role
*/

-- Add admin_id column to booking_offers
ALTER TABLE public.booking_offers
ADD COLUMN admin_id uuid REFERENCES auth.users(id);

-- Update create_booking_offer function
CREATE OR REPLACE FUNCTION public.create_booking_offer(
  p_inquiry_id uuid,
  p_total_cost_cents bigint,
  p_valid_until timestamptz,
  p_notes text DEFAULT NULL,
  p_spaces jsonb DEFAULT NULL,
  p_services jsonb DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer_id uuid;
BEGIN
  -- Check if user is administrator
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name = 'administrator'
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Create offer
  INSERT INTO public.booking_offers (
    inquiry_id,
    admin_id,
    total_cost_cents,
    valid_until,
    notes,
    status
  ) VALUES (
    p_inquiry_id,
    auth.uid(),
    p_total_cost_cents,
    p_valid_until,
    p_notes,
    'draft'
  ) RETURNING id INTO v_offer_id;

  -- Save allocations if provided
  IF p_spaces IS NOT NULL OR p_services IS NOT NULL THEN
    PERFORM public.save_offer_allocations(
      v_offer_id,
      p_spaces,
      p_services
    );
  END IF;

  RETURN v_offer_id;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.create_booking_offer IS 'Creates a new booking offer with proper admin tracking';