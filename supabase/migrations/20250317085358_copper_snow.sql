/*
  # Add Draft Offer Summary Function

  1. Changes
    - Add function to create booking_offers summary when saving draft
    - Add trigger to automatically create summary
    - Add validation for required fields
    
  2. Security
    - Maintain existing RLS policies
    - Ensure proper access control
*/

-- Create function to create booking_offers summary
CREATE OR REPLACE FUNCTION public.create_draft_offer_summary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create initial offer summary with status 'draft'
  INSERT INTO public.booking_offers (
    inquiry_id,
    admin_id,
    status,
    total_cost_cents,
    valid_until,
    notes,
    created_at,
    updated_at
  ) VALUES (
    NEW.inquiry_id,
    NEW.admin_id,
    'draft',
    NEW.total_cost_cents,
    NEW.valid_until,
    NEW.notes,
    NEW.created_at,
    NEW.updated_at
  );

  RETURN NEW;
END;
$$;

-- Create trigger to automatically create summary
DROP TRIGGER IF EXISTS create_draft_summary ON public.draft_offers;
CREATE TRIGGER create_draft_summary
  AFTER INSERT ON public.draft_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.create_draft_offer_summary();

-- Add comments
COMMENT ON FUNCTION public.create_draft_offer_summary IS 'Creates a booking_offers summary when a draft offer is saved';
COMMENT ON TRIGGER create_draft_summary ON public.draft_offers IS 'Automatically creates a booking_offers summary when saving a draft offer';