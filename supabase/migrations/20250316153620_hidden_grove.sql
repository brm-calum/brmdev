/*
  # Fix Booking Offers Admin Relationship

  1. Changes
    - Drop and recreate booking_offers table with proper relationships
    - Preserve existing data
    - Add proper indexes and constraints
    
  2. Security
    - Maintain existing RLS policies
    - Ensure proper access control
*/

-- Backup existing data
CREATE TEMP TABLE booking_offers_backup AS
SELECT * FROM booking_offers;

-- Drop existing table
DROP TABLE IF EXISTS booking_offers CASCADE;

-- Recreate table with proper relationships
CREATE TABLE public.booking_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES public.booking_inquiries(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.offer_status DEFAULT 'draft'::public.offer_status NOT NULL,
  total_cost_cents bigint NOT NULL,
  valid_until timestamptz NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.booking_offers ENABLE ROW LEVEL SECURITY;

-- Restore data
INSERT INTO booking_offers
SELECT * FROM booking_offers_backup;

-- Drop temp table
DROP TABLE booking_offers_backup;

-- Add indexes
CREATE INDEX booking_offers_inquiry_id_idx ON public.booking_offers(inquiry_id);
CREATE INDEX booking_offers_admin_id_idx ON public.booking_offers(admin_id);
CREATE INDEX booking_offers_status_idx ON public.booking_offers(status);

-- Add policies
CREATE POLICY "Admins can manage all offers"
ON public.booking_offers
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
    AND r.name = 'administrator'
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

-- Add comments
COMMENT ON TABLE public.booking_offers IS 'Stores offers made in response to booking inquiries';
COMMENT ON COLUMN public.booking_offers.admin_id IS 'The administrator who created the offer';
COMMENT ON COLUMN public.booking_offers.status IS 'Current status of the offer';
COMMENT ON COLUMN public.booking_offers.total_cost_cents IS 'Total cost of the offer in cents';
COMMENT ON COLUMN public.booking_offers.valid_until IS 'Date until which the offer is valid';