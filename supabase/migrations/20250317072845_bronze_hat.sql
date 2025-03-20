/*
  # Add Draft Offer Tables

  1. New Tables
    - `draft_offer_allocations`: Stores space and service allocations for draft offers
    - `draft_offer_summaries`: Stores calculated totals for draft offers
    
  2. Security
    - Enable RLS on all tables
    - Add policies for administrator access
    
  3. Changes
    - Add support for storing draft offer calculations
    - Add proper relationships and constraints
    - Add functions for managing draft offers
*/

-- Create draft offer allocations table
CREATE TABLE public.draft_offer_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.booking_offers(id) ON DELETE CASCADE,
  space_id uuid REFERENCES public.m_warehouse_spaces(id),
  service_id uuid REFERENCES public.warehouse_services(id),
  allocation_type text NOT NULL CHECK (allocation_type IN ('space', 'service')),
  requested_quantity numeric,
  allocated_quantity numeric,
  list_price_cents bigint,
  offer_price_cents bigint,
  estimated_total_cents bigint,
  offer_total_cents bigint,
  unit_type text,
  comments text,
  is_manual_price boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_allocation_type CHECK (
    (allocation_type = 'space' AND space_id IS NOT NULL AND service_id IS NULL) OR
    (allocation_type = 'service' AND service_id IS NOT NULL AND space_id IS NULL)
  ),
  CONSTRAINT positive_quantities CHECK (
    requested_quantity >= 0 AND
    allocated_quantity >= 0
  ),
  CONSTRAINT valid_prices CHECK (
    list_price_cents >= 0 AND
    offer_price_cents >= 0
  )
);

-- Create draft offer summaries table
CREATE TABLE public.draft_offer_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.booking_offers(id) ON DELETE CASCADE,
  space_total_cents bigint NOT NULL DEFAULT 0,
  service_total_cents bigint NOT NULL DEFAULT 0,
  manual_total_cents bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(offer_id)
);

-- Enable RLS
ALTER TABLE public.draft_offer_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_offer_summaries ENABLE ROW LEVEL SECURITY;

-- Create policies for administrators
CREATE POLICY "Administrators can manage draft allocations"
  ON public.draft_offer_allocations
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

CREATE POLICY "Administrators can manage draft summaries"
  ON public.draft_offer_summaries
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

-- Create function to save draft offer allocations
CREATE OR REPLACE FUNCTION public.save_draft_allocations(
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
  v_service_total bigint := 0;
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

  -- Delete existing allocations
  DELETE FROM draft_offer_allocations WHERE offer_id = p_offer_id;
  
  -- Insert space allocations
  FOR v_space IN SELECT * FROM jsonb_array_elements(p_space_allocations)
  LOOP
    INSERT INTO draft_offer_allocations (
      offer_id,
      space_id,
      allocation_type,
      requested_quantity,
      allocated_quantity,
      list_price_cents,
      offer_price_cents,
      estimated_total_cents,
      offer_total_cents,
      is_manual_price,
      comments
    ) VALUES (
      p_offer_id,
      (v_space->>'space_id')::uuid,
      'space',
      (v_space->>'requested_quantity')::numeric,
      (v_space->>'allocated_quantity')::numeric,
      (v_space->>'list_price_cents')::bigint,
      (v_space->>'offer_price_cents')::bigint,
      (v_space->>'estimated_total_cents')::bigint,
      (v_space->>'offer_total_cents')::bigint,
      (v_space->>'is_manual_price')::boolean,
      v_space->>'comments'
    );
    
    v_space_total := v_space_total + COALESCE((v_space->>'offer_total_cents')::bigint, 0);
  END LOOP;

  -- Insert service allocations if provided
  IF p_service_allocations IS NOT NULL THEN
    FOR v_service IN SELECT * FROM jsonb_array_elements(p_service_allocations)
    LOOP
      INSERT INTO draft_offer_allocations (
        offer_id,
        service_id,
        allocation_type,
        requested_quantity,
        allocated_quantity,
        list_price_cents,
        offer_price_cents,
        estimated_total_cents,
        offer_total_cents,
        unit_type,
        is_manual_price,
        comments
      ) VALUES (
        p_offer_id,
        (v_service->>'service_id')::uuid,
        'service',
        (v_service->>'requested_quantity')::numeric,
        (v_service->>'allocated_quantity')::numeric,
        (v_service->>'list_price_cents')::bigint,
        (v_service->>'offer_price_cents')::bigint,
        (v_service->>'estimated_total_cents')::bigint,
        (v_service->>'offer_total_cents')::bigint,
        v_service->>'unit_type',
        (v_service->>'is_manual_price')::boolean,
        v_service->>'comments'
      );
      
      v_service_total := v_service_total + COALESCE((v_service->>'offer_total_cents')::bigint, 0);
    END LOOP;
  END IF;

  -- Update or insert summary
  INSERT INTO draft_offer_summaries (
    offer_id,
    space_total_cents,
    service_total_cents
  ) VALUES (
    p_offer_id,
    v_space_total,
    v_service_total
  )
  ON CONFLICT (offer_id) DO UPDATE SET
    space_total_cents = v_space_total,
    service_total_cents = v_service_total,
    updated_at = now();

  RETURN p_offer_id;
END;
$$;

-- Add comments
COMMENT ON TABLE public.draft_offer_allocations IS 'Stores draft space and service allocations for offers';
COMMENT ON TABLE public.draft_offer_summaries IS 'Stores calculated totals for draft offers';
COMMENT ON FUNCTION public.save_draft_allocations IS 'Saves draft allocations for an offer with proper totals calculation';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.save_draft_allocations TO authenticated;