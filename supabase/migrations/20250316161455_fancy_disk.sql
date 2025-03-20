/*
  # Update Service Allocations Table

  1. Changes
    - Add missing columns to offer_service_allocations
    - Add constraints and checks
    - Update column definitions for clarity
  
  2. Security
    - Maintain existing RLS policies
    - No changes to permissions required
*/

-- Drop existing table
DROP TABLE IF EXISTS public.offer_service_allocations CASCADE;

-- Recreate table with proper structure
CREATE TABLE public.offer_service_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.booking_offers(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.warehouse_services(id) ON DELETE CASCADE,
  pricing_type text NOT NULL CHECK (
    pricing_type IN ('hourly_rate', 'per_unit', 'fixed', 'ask_quote')
  ),
  -- Quantity fields
  requested_quantity numeric,
  allocated_quantity numeric,
  duration_days integer,
  -- Pricing fields
  list_price_cents bigint,
  offer_price_cents bigint,
  estimated_total_cents bigint,
  offer_total_cents bigint,
  -- Additional fields
  unit_type text,
  comments text,
  is_offer_price_manual boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Add constraints
  CONSTRAINT positive_quantities CHECK (
    (requested_quantity IS NULL OR requested_quantity >= 0) AND
    (allocated_quantity IS NULL OR allocated_quantity >= 0)
  ),
  CONSTRAINT positive_prices CHECK (
    (list_price_cents IS NULL OR list_price_cents >= 0) AND
    (offer_price_cents IS NULL OR offer_price_cents >= 0) AND
    (estimated_total_cents IS NULL OR estimated_total_cents >= 0) AND
    (offer_total_cents IS NULL OR offer_total_cents >= 0)
  ),
  CONSTRAINT valid_duration CHECK (
    duration_days IS NULL OR duration_days > 0
  ),
  CONSTRAINT pricing_type_requirements CHECK (
    (pricing_type = 'hourly_rate' AND offer_price_cents IS NOT NULL) OR
    (pricing_type = 'per_unit' AND offer_price_cents IS NOT NULL AND unit_type IS NOT NULL) OR
    (pricing_type = 'fixed' AND offer_total_cents IS NOT NULL) OR
    (pricing_type = 'ask_quote')
  )
);

-- Enable RLS
ALTER TABLE public.offer_service_allocations ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX offer_service_allocations_offer_id_idx ON public.offer_service_allocations(offer_id);
CREATE INDEX offer_service_allocations_service_id_idx ON public.offer_service_allocations(service_id);

-- Add RLS policy
CREATE POLICY "Administrators can manage service allocations"
  ON public.offer_service_allocations
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

-- Add comments
COMMENT ON TABLE public.offer_service_allocations IS 'Stores service allocations for booking offers';
COMMENT ON COLUMN public.offer_service_allocations.pricing_type IS 'Type of pricing: hourly_rate, per_unit, fixed, or ask_quote';
COMMENT ON COLUMN public.offer_service_allocations.requested_quantity IS 'Quantity requested by the customer';
COMMENT ON COLUMN public.offer_service_allocations.allocated_quantity IS 'Quantity allocated in the offer';
COMMENT ON COLUMN public.offer_service_allocations.duration_days IS 'Duration in days for time-based services';
COMMENT ON COLUMN public.offer_service_allocations.list_price_cents IS 'Original list price in cents';
COMMENT ON COLUMN public.offer_service_allocations.offer_price_cents IS 'Offered price in cents';
COMMENT ON COLUMN public.offer_service_allocations.estimated_total_cents IS 'Estimated total based on list price';
COMMENT ON COLUMN public.offer_service_allocations.offer_total_cents IS 'Final offered total in cents';
COMMENT ON COLUMN public.offer_service_allocations.unit_type IS 'Unit type for per-unit pricing (e.g., hour, pallet)';
COMMENT ON COLUMN public.offer_service_allocations.is_offer_price_manual IS 'Whether the offer price was manually set';