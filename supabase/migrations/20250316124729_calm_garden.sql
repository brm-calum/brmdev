/*
  # Add Spreadsheet-Style Offer System

  1. New Tables
    - `offer_space_allocations`: Tracks space allocations with original request, allocated space, and pricing
    - `offer_service_allocations`: Tracks service allocations with quantities, pricing types, and rates
    - `offer_summaries`: Stores offer totals and price comparisons

  2. Security
    - Enable RLS on all new tables
    - Add policies for administrator access
    - Add functions for managing offer allocations

  3. Changes
    - Add support for tracking original request vs allocation
    - Add duration-based pricing calculations
    - Add comments field for changes
*/

-- Create offer space allocations table
CREATE TABLE public.offer_space_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.booking_offers(id) ON DELETE CASCADE,
  space_request_id uuid NOT NULL REFERENCES public.booking_inquiry_space_requests(id) ON DELETE CASCADE,
  space_type_id uuid NOT NULL REFERENCES public.m_space_types(id),
  requested_size_m2 numeric NOT NULL,
  allocated_size_m2 numeric NOT NULL,
  duration_days integer NOT NULL,
  list_price_per_m2_cents bigint NOT NULL,
  offer_price_per_m2_cents bigint NOT NULL,
  estimated_total_cents bigint NOT NULL,
  offer_total_cents bigint NOT NULL,
  comments text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create offer service allocations table
CREATE TABLE public.offer_service_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.booking_offers(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.warehouse_services(id) ON DELETE CASCADE,
  pricing_type text NOT NULL CHECK (pricing_type IN ('hourly_rate', 'per_unit', 'fixed')),
  requested_quantity numeric,
  allocated_quantity numeric,
  duration_days integer,
  list_price_cents bigint NOT NULL,
  offer_price_cents bigint NOT NULL,
  estimated_total_cents bigint NOT NULL,
  offer_total_cents bigint NOT NULL,
  unit_type text,
  comments text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create offer summaries table
CREATE TABLE public.offer_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.booking_offers(id) ON DELETE CASCADE,
  inquiry_id uuid NOT NULL REFERENCES public.booking_inquiries(id) ON DELETE CASCADE,
  quoted_price_cents bigint NOT NULL,
  calculated_price_cents bigint NOT NULL,
  actual_offer_cents bigint NOT NULL,
  space_total_cents bigint NOT NULL,
  services_total_cents bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(offer_id)
);

-- Enable RLS
ALTER TABLE public.offer_space_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_service_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_summaries ENABLE ROW LEVEL SECURITY;

-- Create policies for administrators
CREATE POLICY "Administrators can manage offer space allocations"
  ON public.offer_space_allocations
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

CREATE POLICY "Administrators can manage offer service allocations"
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

CREATE POLICY "Administrators can manage offer summaries"
  ON public.offer_summaries
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

-- Function to save offer allocations
CREATE OR REPLACE FUNCTION public.save_offer_allocations(
  p_offer_id uuid,
  p_space_allocations jsonb,
  p_service_allocations jsonb DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_space jsonb;
  v_service jsonb;
  v_space_total bigint := 0;
  v_services_total bigint := 0;
  v_inquiry_id uuid;
  v_quoted_price bigint;
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

  -- Get inquiry ID and quoted price
  SELECT 
    bi.id, 
    bi.estimated_cost_cents 
  INTO v_inquiry_id, v_quoted_price
  FROM booking_offers bo
  JOIN booking_inquiries bi ON bi.id = bo.inquiry_id
  WHERE bo.id = p_offer_id;

  -- Delete existing allocations
  DELETE FROM offer_space_allocations WHERE offer_id = p_offer_id;
  DELETE FROM offer_service_allocations WHERE offer_id = p_offer_id;
  
  -- Insert space allocations
  FOR v_space IN SELECT * FROM jsonb_array_elements(p_space_allocations)
  LOOP
    INSERT INTO offer_space_allocations (
      offer_id,
      space_request_id,
      space_type_id,
      requested_size_m2,
      allocated_size_m2,
      duration_days,
      list_price_per_m2_cents,
      offer_price_per_m2_cents,
      estimated_total_cents,
      offer_total_cents,
      comments
    ) VALUES (
      p_offer_id,
      (v_space->>'space_request_id')::uuid,
      (v_space->>'space_type_id')::uuid,
      (v_space->>'requested_size_m2')::numeric,
      (v_space->>'allocated_size_m2')::numeric,
      (v_space->>'duration_days')::integer,
      (v_space->>'list_price_per_m2_cents')::bigint,
      (v_space->>'offer_price_per_m2_cents')::bigint,
      (v_space->>'estimated_total_cents')::bigint,
      (v_space->>'offer_total_cents')::bigint,
      v_space->>'comments'
    );
    
    v_space_total := v_space_total + (v_space->>'offer_total_cents')::bigint;
  END LOOP;

  -- Insert service allocations if provided
  IF p_service_allocations IS NOT NULL THEN
    FOR v_service IN SELECT * FROM jsonb_array_elements(p_service_allocations)
    LOOP
      INSERT INTO offer_service_allocations (
        offer_id,
        service_id,
        pricing_type,
        requested_quantity,
        allocated_quantity,
        duration_days,
        list_price_cents,
        offer_price_cents,
        estimated_total_cents,
        offer_total_cents,
        unit_type,
        comments
      ) VALUES (
        p_offer_id,
        (v_service->>'service_id')::uuid,
        v_service->>'pricing_type',
        (v_service->>'requested_quantity')::numeric,
        (v_service->>'allocated_quantity')::numeric,
        (v_service->>'duration_days')::integer,
        (v_service->>'list_price_cents')::bigint,
        (v_service->>'offer_price_cents')::bigint,
        (v_service->>'estimated_total_cents')::bigint,
        (v_service->>'offer_total_cents')::bigint,
        v_service->>'unit_type',
        v_service->>'comments'
      );
      
      v_services_total := v_services_total + (v_service->>'offer_total_cents')::bigint;
    END LOOP;
  END IF;

  -- Update or insert offer summary
  INSERT INTO offer_summaries (
    offer_id,
    inquiry_id,
    quoted_price_cents,
    calculated_price_cents,
    actual_offer_cents,
    space_total_cents,
    services_total_cents
  ) VALUES (
    p_offer_id,
    v_inquiry_id,
    v_quoted_price,
    v_space_total + v_services_total,
    v_space_total + v_services_total,
    v_space_total,
    v_services_total
  )
  ON CONFLICT (offer_id) DO UPDATE SET
    calculated_price_cents = v_space_total + v_services_total,
    actual_offer_cents = v_space_total + v_services_total,
    space_total_cents = v_space_total,
    services_total_cents = v_services_total,
    updated_at = now();

  RETURN p_offer_id;
END;
$$;