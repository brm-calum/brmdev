/*
  # Add Space Relationship to Booking Offer Spaces

  1. Changes
    - Add foreign key relationship between booking_offer_spaces and m_warehouse_spaces
    - Add proper indexes for performance
    
  2. Security
    - Maintain existing RLS policies
    - No changes to permissions required
*/

-- Add foreign key relationship
ALTER TABLE public.booking_offer_spaces
DROP CONSTRAINT IF EXISTS booking_offer_spaces_space_id_fkey,
ADD CONSTRAINT booking_offer_spaces_space_id_fkey 
FOREIGN KEY (space_id) 
REFERENCES public.m_warehouse_spaces(id)
ON DELETE RESTRICT;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_booking_offer_spaces_space_id ON public.booking_offer_spaces(space_id);

-- Add comment
COMMENT ON CONSTRAINT booking_offer_spaces_space_id_fkey ON public.booking_offer_spaces IS 'Links space allocations to warehouse spaces';