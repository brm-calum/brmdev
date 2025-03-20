/*
  # Add Offer Status Handling

  1. Changes
    - Add trigger to update inquiry status when offer is sent
    - Add function to get offers for traders
    - Add policies for traders to view offers
    
  2. Security
    - Maintain existing RLS policies
    - Add proper access control for traders
*/

-- Create function to update inquiry status when offer is sent
CREATE OR REPLACE FUNCTION public.update_inquiry_status_on_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update inquiry status when offer is sent
  IF NEW.status = 'sent' AND OLD.status = 'draft' THEN
    UPDATE public.booking_inquiries
    SET 
      status = 'offer_sent',
      updated_at = now()
    WHERE id = NEW.inquiry_id;
  END IF;

  -- Update inquiry status when offer is accepted
  IF NEW.status = 'accepted' AND OLD.status = 'sent' THEN
    UPDATE public.booking_inquiries
    SET 
      status = 'accepted',
      updated_at = now()
    WHERE id = NEW.inquiry_id;
  END IF;

  -- Update inquiry status when offer is rejected
  IF NEW.status = 'rejected' AND OLD.status = 'sent' THEN
    UPDATE public.booking_inquiries
    SET 
      status = 'offer_pending',
      updated_at = now()
    WHERE id = NEW.inquiry_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for offer status changes
DROP TRIGGER IF EXISTS update_inquiry_status_trigger ON public.booking_offers;
CREATE TRIGGER update_inquiry_status_trigger
  AFTER UPDATE OF status ON public.booking_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inquiry_status_on_offer();

-- Create function to get offer details for traders
CREATE OR REPLACE FUNCTION public.get_trader_offer_details(p_offer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Check if user owns the inquiry
  IF NOT EXISTS (
    SELECT 1 
    FROM booking_offers bo
    JOIN booking_inquiries bi ON bi.id = bo.inquiry_id
    WHERE bo.id = p_offer_id
    AND bi.trader_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT jsonb_build_object(
    'id', bo.id,
    'inquiry_id', bo.inquiry_id,
    'status', bo.status,
    'total_cost_cents', bo.total_cost_cents,
    'valid_until', bo.valid_until,
    'notes', bo.notes,
    'created_at', bo.created_at,
    'updated_at', bo.updated_at,
    'admin', jsonb_build_object(
      'first_name', p.first_name,
      'last_name', p.last_name
    ),
    'spaces', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'space_allocated_m2', s.space_allocated_m2,
          'price_per_m2_cents', s.price_per_m2_cents,
          'offer_total_cents', s.offer_total_cents,
          'comments', s.comments,
          'space', jsonb_build_object(
            'id', ws.id,
            'space_type', jsonb_build_object(
              'id', st.id,
              'name', st.name
            ),
            'warehouse', jsonb_build_object(
              'id', w.id,
              'name', w.name,
              'city', w.city,
              'country', w.country
            )
          )
        )
      )
      FROM booking_offer_spaces s
      JOIN m_warehouse_spaces ws ON ws.id = s.space_id
      JOIN m_space_types st ON st.id = ws.space_type_id
      JOIN m_warehouses w ON w.id = ws.warehouse_id
      WHERE s.offer_id = bo.id
    ),
    'services', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'service', jsonb_build_object(
            'id', ws.id,
            'name', ws.name
          ),
          'pricing_type', s.pricing_type,
          'quantity', s.quantity,
          'price_per_hour_cents', s.price_per_hour_cents,
          'price_per_unit_cents', s.price_per_unit_cents,
          'unit_type', s.unit_type,
          'fixed_price_cents', s.fixed_price_cents,
          'offer_total_cents', s.offer_total_cents,
          'comments', s.comments
        )
      )
      FROM booking_offer_services s
      JOIN warehouse_services ws ON ws.id = s.service_id
      WHERE s.offer_id = bo.id
    ),
    'summary', (
      SELECT jsonb_build_object(
        'quoted_price_cents', os.quoted_price_cents,
        'calculated_price_cents', os.calculated_price_cents,
        'actual_offer_cents', os.actual_offer_cents,
        'space_total_cents', os.space_total_cents,
        'services_total_cents', os.services_total_cents
      )
      FROM offer_summaries os
      WHERE os.offer_id = bo.id
    )
  ) INTO v_result
  FROM booking_offers bo
  JOIN profiles p ON p.user_id = bo.admin_id
  WHERE bo.id = p_offer_id;

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_trader_offer_details TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.update_inquiry_status_on_offer IS 'Updates inquiry status when offer status changes';
COMMENT ON FUNCTION public.get_trader_offer_details IS 'Gets offer details formatted for trader view';