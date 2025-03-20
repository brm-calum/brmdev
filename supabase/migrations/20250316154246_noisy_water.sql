/*
  # Test Data for getResponses Function

  1. Changes
    - Add test users
    - Add test inquiries
    - Add test responses
    - Add test data validation
  
  2. Security
    - Maintain existing RLS policies
    - Test data follows security rules
*/

-- Create test users if they don't exist
DO $$ 
DECLARE
  v_trader_id uuid;
  v_admin_id uuid;
  v_inquiry_id uuid;
BEGIN
  -- Create test trader
  INSERT INTO auth.users (id, email)
  VALUES 
    ('11111111-1111-1111-1111-111111111111', 'test.trader@example.com')
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO v_trader_id;

  -- Create test admin
  INSERT INTO auth.users (id, email)
  VALUES 
    ('22222222-2222-2222-2222-222222222222', 'test.admin@example.com')
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO v_admin_id;

  -- Create profiles for test users
  INSERT INTO public.profiles (user_id, first_name, last_name, contact_email)
  VALUES
    ('11111111-1111-1111-1111-111111111111', 'Test', 'Trader', 'test.trader@example.com'),
    ('22222222-2222-2222-2222-222222222222', 'Test', 'Admin', 'test.admin@example.com')
  ON CONFLICT (user_id) DO NOTHING;

  -- Assign roles
  INSERT INTO public.user_roles (user_id, role_id)
  SELECT '22222222-2222-2222-2222-222222222222', id
  FROM public.roles
  WHERE name = 'administrator'
  ON CONFLICT DO NOTHING;

  -- Create test inquiry
  INSERT INTO public.booking_inquiries (
    id,
    trader_id,
    start_date,
    end_date,
    status,
    notes
  ) VALUES (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    now(),
    now() + interval '30 days',
    'submitted',
    'Test inquiry'
  ) ON CONFLICT (id) DO NOTHING
  RETURNING id INTO v_inquiry_id;

  -- Add test responses
  INSERT INTO public.inquiry_responses (
    inquiry_id,
    sender_id,
    recipient_id,
    message,
    type,
    created_at
  ) VALUES 
    (
      v_inquiry_id,
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
      'Initial inquiry message',
      'message',
      now() - interval '2 days'
    ),
    (
      v_inquiry_id,
      '22222222-2222-2222-2222-222222222222',
      '11111111-1111-1111-1111-111111111111',
      'Admin response',
      'message',
      now() - interval '1 day'
    ),
    (
      v_inquiry_id,
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
      'Follow-up question',
      'message',
      now()
    )
  ON CONFLICT DO NOTHING;

  -- Verify data
  IF NOT EXISTS (
    SELECT 1 FROM public.inquiry_responses 
    WHERE inquiry_id = v_inquiry_id
    AND sender_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
  ) THEN
    RAISE EXCEPTION 'Test data verification failed';
  END IF;
END $$;

-- Add test query to verify getResponses functionality
COMMENT ON TABLE public.inquiry_responses IS 'Test query for getResponses:
SELECT 
  r.*,
  sender:sender_id(
    id,
    email,
    first_name,
    last_name
  )
FROM inquiry_responses r
WHERE inquiry_id = ''33333333-3333-3333-3333-333333333333''
ORDER BY created_at ASC;
';