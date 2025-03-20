/*
  # Draft Offers Schema

  1. New Tables
    - `draft_offers`: Stores draft offers before they are finalized
    - `draft_offer_spaces`: Space allocations for draft offers
    - `draft_offer_services`: Service allocations for draft offers
    
  2. Security
    - Enable RLS on all tables
    - Add policies for administrators only
    
  3. Changes
    - Add support for saving and managing draft offers
    - Track space and service allocations
    - Store pricing and comments
*/

-- Create draft offers table
CREATE TABLE public.draft_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES public.booking_inquiries(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_cost_cents bigint NOT NULL,
  valid_until timestamptz NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create draft offer spaces table
CREATE TABLE public.draft_offer_spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.draft_offers(id) ON DELETE CASCADE,
  space_id uuid NOT NULL REFERENCES public.m_warehouse_spaces(id) ON DELETE CASCADE,
  space_allocated_m2 numeric NOT NULL,
  price_per_m2_cents bigint NOT NULL,
  offer_price_cents bigint NOT NULL,
  comments text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create draft offer services table
CREATE TABLE public.draft_offer_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.draft_offers(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.warehouse_services(id) ON DELETE CASCADE,
  pricing_type text NOT NULL CHECK (pricing_type IN ('hourly_rate', 'per_unit', 'fixed')),
  quantity numeric,
  price_per_hour_cents bigint,
  price_per_unit_cents bigint,
  unit_type text,
  fixed_price_cents bigint,
  offer_price_cents bigint NOT NULL,
  comments text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.draft_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_offer_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_offer_services ENABLE ROW LEVEL SECURITY;

-- Create policies for draft_offers
CREATE POLICY "Administrators can manage draft offers"
  ON public.draft_offers
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

-- Create policies for draft_offer_spaces
CREATE POLICY "Administrators can manage draft offer spaces"
  ON public.draft_offer_spaces
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

-- Create policies for draft_offer_services
CREATE POLICY "Administrators can manage draft offer services"
  ON public.draft_offer_services
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

-- Function to save draft offer
CREATE OR REPLACE FUNCTION public.save_draft_offer(
  p_inquiry_id uuid,
  p_total_cost_cents bigint,
  p_valid_until timestamptz,
  p_notes text,
  p_spaces jsonb,
  p_services jsonb DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer_id uuid;
  v_space jsonb;
  v_service jsonb;
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

  -- Create draft offer
  INSERT INTO public.draft_offers (
    inquiry_id,
    admin_id,
    total_cost_cents,
    valid_until,
    notes
  ) VALUES (
    p_inquiry_id,
    auth.uid(),
    p_total_cost_cents,
    p_valid_until,
    p_notes
  ) RETURNING id INTO v_offer_id;

  -- Insert space allocations
  FOR v_space IN SELECT * FROM jsonb_array_elements(p_spaces)
  LOOP
    INSERT INTO public.draft_offer_spaces (
      offer_id,
      space_id,
      space_allocated_m2,
      price_per_m2_cents,
      offer_price_cents,
      comments
    ) VALUES (
      v_offer_id,
      (v_space->>'space_id')::uuid,
      (v_space->>'space_allocated_m2')::numeric,
      (v_space->>'price_per_m2_cents')::bigint,
      (v_space->>'offer_price_cents')::bigint,
      v_space->>'comments'
    );
  END LOOP;

  -- Insert service allocations if provided
  IF p_services IS NOT NULL THEN
    FOR v_service IN SELECT * FROM jsonb_array_elements(p_services)
    LOOP
      INSERT INTO public.draft_offer_services (
        offer_id,
        service_id,
        pricing_type,
        quantity,
        price_per_hour_cents,
        price_per_unit_cents,
        unit_type,
        fixed_price_cents,
        offer_price_cents,
        comments
      ) VALUES (
        v_offer_id,
        (v_service->>'service_id')::uuid,
        v_service->>'pricing_type',
        (v_service->>'quantity')::numeric,
        (v_service->>'price_per_hour_cents')::bigint,
        (v_service->>'price_per_unit_cents')::bigint,
        v_service->>'unit_type',
        (v_service->>'fixed_price_cents')::bigint,
        (v_service->>'offer_price_cents')::bigint,
        v_service->>'comments'
      );
    END LOOP;
  END IF;

  RETURN v_offer_id;
END;
$$;