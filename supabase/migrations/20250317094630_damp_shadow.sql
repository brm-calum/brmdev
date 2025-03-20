/*
  # Add Missing Foreign Key Relationships

  1. Changes
    - Add foreign key relationships between booking_offers and related tables
    - Add missing indexes for performance
    - Add proper constraints
    
  2. Security
    - Maintain existing RLS policies
    - No changes to permissions required
*/

-- Add foreign key relationships
ALTER TABLE public.booking_offer_spaces
DROP CONSTRAINT IF EXISTS booking_offer_spaces_offer_id_fkey,
ADD CONSTRAINT booking_offer_spaces_offer_id_fkey 
FOREIGN KEY (offer_id) 
REFERENCES public.booking_offers(id)
ON DELETE CASCADE;

ALTER TABLE public.booking_offer_services
DROP CONSTRAINT IF EXISTS booking_offer_services_offer_id_fkey,
ADD CONSTRAINT booking_offer_services_offer_id_fkey 
FOREIGN KEY (offer_id) 
REFERENCES public.booking_offers(id)
ON DELETE CASCADE;

ALTER TABLE public.booking_offer_terms
DROP CONSTRAINT IF EXISTS booking_offer_terms_offer_id_fkey,
ADD CONSTRAINT booking_offer_terms_offer_id_fkey 
FOREIGN KEY (offer_id) 
REFERENCES public.booking_offers(id)
ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_booking_offer_spaces_offer_id ON public.booking_offer_spaces(offer_id);
CREATE INDEX IF NOT EXISTS idx_booking_offer_services_offer_id ON public.booking_offer_services(offer_id);
CREATE INDEX IF NOT EXISTS idx_booking_offer_terms_offer_id ON public.booking_offer_terms(offer_id);

-- Add comments
COMMENT ON CONSTRAINT booking_offer_spaces_offer_id_fkey ON public.booking_offer_spaces IS 'Links space allocations to their offer';
COMMENT ON CONSTRAINT booking_offer_services_offer_id_fkey ON public.booking_offer_services IS 'Links service allocations to their offer';
COMMENT ON CONSTRAINT booking_offer_terms_offer_id_fkey ON public.booking_offer_terms IS 'Links terms to their offer';