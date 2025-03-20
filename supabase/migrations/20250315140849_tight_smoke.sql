/*
  # Updated Warehouse Inquiry SQL

  1. Changes
    - Create a view to join booking inquiries with profiles.
    - Enable RLS on the underlying table (booking_inquiries) rather than the view.
    - Create RLS policies on the table to restrict data access.
    - Create a function to get trader profile info.
  
  2. Security
    - Enable RLS on booking_inquiries.
    - Add policies to ensure users can only see their own data.
    - Admins can see all inquiries.
*/

-- Create or replace a view that joins booking inquiries with profiles
CREATE OR REPLACE VIEW public.booking_inquiries_with_profiles AS
SELECT 
  bi.*,
  p.first_name AS trader_first_name,
  p.last_name AS trader_last_name,
  p.contact_email AS trader_email,
  p.company_name AS trader_company_name
FROM public.booking_inquiries bi
LEFT JOIN public.profiles p ON bi.trader_id = p.user_id;

-- Enable RLS on the base table (booking_inquiries)
ALTER TABLE public.booking_inquiries ENABLE ROW LEVEL SECURITY;

-- Create a policy on the table for users to see their own inquiries
CREATE POLICY "Users can view own inquiries"
  ON public.booking_inquiries
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = trader_id OR
    EXISTS (
      SELECT 1 
      FROM auth.users
      WHERE auth.users.id = auth.uid()
        AND auth.users.role = 'administrator'
    )
  );

-- Function to get trader profile info
CREATE OR REPLACE FUNCTION public.get_trader_profile(inquiry_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'id', p.id,
      'first_name', p.first_name,
      'last_name', p.last_name,
      'email', p.contact_email,
      'company_name', p.company_name
    )
    FROM public.booking_inquiries bi
    JOIN public.profiles p ON bi.trader_id = p.user_id
    WHERE bi.id = inquiry_id
      AND (
        bi.trader_id = auth.uid() OR
        EXISTS (
          SELECT 1 
          FROM auth.users
          WHERE auth.users.id = auth.uid()
            AND auth.users.role = 'administrator'
        )
      )
  );
END;
$$;
