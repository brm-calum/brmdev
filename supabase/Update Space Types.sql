-- SQL Migration: Update schema to support multiple space types per warehouse

-- Step 1: Remove single space type field from warehouses table
ALTER TABLE public.warehouses
DROP COLUMN type_id;

-- Step 2: Create a table to define space types
CREATE TABLE public.space_types (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    description text
);

-- Step 3: Create a join table for warehouses and space types
CREATE TABLE public.warehouse_space_types (
    warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    space_type_id uuid NOT NULL REFERENCES public.space_types(id) ON DELETE CASCADE,
    PRIMARY KEY (warehouse_id, space_type_id)
);

-- Step 4: Optional - Seed space_types with initial values
INSERT INTO public.space_types (name, description) VALUES
('Indoors', 'Indoor storage space'),
('Outdoors', 'Outdoor storage space'),
('Climate Controlled', 'Temperature-regulated storage space');
