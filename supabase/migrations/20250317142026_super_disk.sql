/*
  # Add Status Transition Function

  1. Changes
    - Add handle_status_transition function
    - Add validation for status transitions
    - Add proper error handling
    
  2. Security
    - Function is SECURITY DEFINER
    - Proper permission checks
*/

-- Create function to handle status transitions
CREATE OR REPLACE FUNCTION public.handle_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_valid boolean;
  v_error_message text;
BEGIN
  -- Check if user is administrator
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid() 
    AND r.name = 'administrator'
  ) INTO v_is_admin;

  -- Validate status transition
  SELECT 
    valid,
    error_message 
  INTO v_valid, v_error_message
  FROM (
    SELECT
      CASE
        -- No change is always valid
        WHEN NEW.status = OLD.status THEN 
          true
        -- Admin transitions
        WHEN v_is_admin THEN
          CASE OLD.status::text
            WHEN 'submitted' THEN 
              NEW.status IN ('under_review', 'cancelled')
            WHEN 'under_review' THEN 
              NEW.status IN ('offer_draft', 'cancelled')
            WHEN 'offer_draft' THEN 
              NEW.status IN ('offer_sent', 'cancelled')
            WHEN 'changes_requested' THEN 
              NEW.status IN ('offer_draft', 'cancelled')
            WHEN 'accepted' THEN 
              NEW.status IN ('confirmed', 'cancelled')
            WHEN 'confirmed' THEN 
              NEW.status IN ('completed', 'cancelled')
            WHEN 'completed' THEN 
              NEW.status = 'archived'
            ELSE false
          END
        -- Trader transitions
        ELSE
          CASE OLD.status::text
            WHEN 'draft' THEN 
              NEW.status IN ('submitted', 'cancelled')
            WHEN 'offer_sent' THEN 
              NEW.status IN ('accepted', 'rejected', 'changes_requested')
            ELSE false
          END
      END as valid,
      CASE
        WHEN NEW.status = OLD.status THEN 
          null
        WHEN NOT v_is_admin AND OLD.status::text NOT IN ('draft', 'offer_sent') THEN
          'You cannot change the status at this stage'
        WHEN v_is_admin AND OLD.status::text NOT IN (
          'submitted', 'under_review', 'offer_draft', 'changes_requested', 
          'accepted', 'confirmed', 'completed'
        ) THEN
          'Invalid status transition for administrator'
        ELSE
          'Invalid status transition'
      END as error_message
  ) validation;

  -- Raise error if transition is invalid
  IF NOT v_valid THEN
    RAISE EXCEPTION 'Invalid status transition: %', v_error_message;
  END IF;

  -- Handle status-specific actions
  CASE NEW.status
    WHEN 'offer_sent' THEN
      -- Set expiry date for offer
      NEW.valid_until := CURRENT_TIMESTAMP + interval '7 days';
    WHEN 'expired' THEN
      -- Clear any pending actions
      NEW.valid_until := NULL;
    ELSE
      -- No special handling needed
      NULL;
  END CASE;

  -- Update timestamp
  NEW.updated_at := CURRENT_TIMESTAMP;
  
  RETURN NEW;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.handle_status_transition IS 'Handles inquiry status transitions with proper validation';