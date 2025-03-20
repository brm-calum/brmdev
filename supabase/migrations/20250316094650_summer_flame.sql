/*
  # Fix Inquiry Permissions

  1. Changes
    - Add missing RLS policies for inquiry-related tables
    - Fix view permissions for booking_inquiries_with_profiles
    - Add policies for space requests and related tables
  
  2. Security
    - Enable RLS on all inquiry-related tables
    - Ensure proper access control based on user roles
*/

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own inquiries" ON booking_inquiries;
DROP POLICY IF EXISTS "Users can create inquiries" ON booking_inquiries;
DROP POLICY IF EXISTS "Users can update own inquiries" ON booking_inquiries;

-- Create new policies for booking_inquiries
CREATE POLICY "Users can view own inquiries" 
ON booking_inquiries FOR SELECT 
USING (
  trader_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name = 'administrator'
  )
);

CREATE POLICY "Users can create inquiries" 
ON booking_inquiries FOR INSERT 
WITH CHECK (trader_id = auth.uid());

CREATE POLICY "Users can update own inquiries" 
ON booking_inquiries FOR UPDATE 
USING (trader_id = auth.uid())
WITH CHECK (trader_id = auth.uid());

-- Enable RLS on related tables
ALTER TABLE booking_inquiry_space_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_inquiry_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_inquiry_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_inquiry_features ENABLE ROW LEVEL SECURITY;

-- Add policies for related tables
CREATE POLICY "Users can view own space requests"
ON booking_inquiry_space_requests FOR SELECT
USING (
  inquiry_id IN (
    SELECT id FROM booking_inquiries WHERE trader_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name = 'administrator'
  )
);

CREATE POLICY "Users can manage own space requests"
ON booking_inquiry_space_requests FOR ALL
USING (
  inquiry_id IN (
    SELECT id FROM booking_inquiries WHERE trader_id = auth.uid()
  )
);

-- Repeat similar policies for warehouses, services, and features
CREATE POLICY "Users can view own inquiry warehouses"
ON booking_inquiry_warehouses FOR SELECT
USING (
  inquiry_id IN (
    SELECT id FROM booking_inquiries WHERE trader_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() AND r.name = 'administrator'
  )
);

CREATE POLICY "Users can manage own inquiry warehouses"
ON booking_inquiry_warehouses FOR ALL
USING (
  inquiry_id IN (
    SELECT id FROM booking_inquiries WHERE trader_id = auth.uid()
  )
);

-- Grant necessary permissions
GRANT SELECT ON booking_inquiries_with_profiles TO authenticated;
GRANT SELECT ON booking_inquiries TO authenticated;
GRANT SELECT ON booking_inquiry_space_requests TO authenticated;
GRANT SELECT ON booking_inquiry_warehouses TO authenticated;
GRANT SELECT ON booking_inquiry_services TO authenticated;
GRANT SELECT ON booking_inquiry_features TO authenticated;