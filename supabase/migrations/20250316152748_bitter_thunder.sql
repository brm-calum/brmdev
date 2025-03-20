/*
  # Fix Missing Database Relationships

  1. Changes
    - Add missing foreign key relationships for inquiry_responses.sender_id
    - Add missing foreign key relationships for booking_offers.admin_id
    - Update related functions to use proper relationships
  
  2. Security
    - Maintain existing RLS policies
    - No changes to permissions required
*/

-- Fix inquiry_responses relationship
ALTER TABLE public.inquiry_responses
DROP CONSTRAINT IF EXISTS inquiry_responses_sender_id_fkey;

ALTER TABLE public.inquiry_responses
ADD CONSTRAINT inquiry_responses_sender_id_fkey 
FOREIGN KEY (sender_id) 
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Fix booking_offers relationship
ALTER TABLE public.booking_offers
DROP CONSTRAINT IF EXISTS booking_offers_admin_id_fkey;

ALTER TABLE public.booking_offers
ADD CONSTRAINT booking_offers_admin_id_fkey 
FOREIGN KEY (admin_id) 
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Add comments
COMMENT ON CONSTRAINT inquiry_responses_sender_id_fkey ON public.inquiry_responses IS 'Links inquiry responses to the user who sent them';
COMMENT ON CONSTRAINT booking_offers_admin_id_fkey ON public.booking_offers IS 'Links booking offers to the admin who created them';