/*
  # Add Missing Columns to Offer Tables

  1. Changes
    - Add id column to booking_offer_spaces
    - Add id column to booking_offer_services
    - Add id column to booking_offer_terms
    - Add proper primary key constraints
    
  2. Security
    - Maintain existing RLS policies
    - No changes to permissions required
*/

-- Add id column to booking_offer_spaces
ALTER TABLE public.booking_offer_spaces
DROP CONSTRAINT IF EXISTS booking_offer_spaces_pkey CASCADE;

ALTER TABLE public.booking_offer_spaces
ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
ADD PRIMARY KEY (id);

-- Add id column to booking_offer_services
ALTER TABLE public.booking_offer_services
DROP CONSTRAINT IF EXISTS booking_offer_services_pkey CASCADE;

ALTER TABLE public.booking_offer_services
ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
ADD PRIMARY KEY (id);

-- Add id column to booking_offer_terms
ALTER TABLE public.booking_offer_terms
DROP CONSTRAINT IF EXISTS booking_offer_terms_pkey CASCADE;

ALTER TABLE public.booking_offer_terms
ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
ADD PRIMARY KEY (id);

-- Add comments
COMMENT ON COLUMN public.booking_offer_spaces.id IS 'Primary key for space allocations';
COMMENT ON COLUMN public.booking_offer_services.id IS 'Primary key for service allocations';
COMMENT ON COLUMN public.booking_offer_terms.id IS 'Primary key for offer terms';