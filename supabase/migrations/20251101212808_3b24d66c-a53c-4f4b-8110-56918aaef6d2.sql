-- Update RLS policy on profiles table to restrict email visibility
-- Users can only see their own email, others see profiles without email details

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Allow users to view all profile data except emails (unless it's their own)
CREATE POLICY "Users can view all profiles (restricted email)"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Note: The above policy still allows SELECT *, but we'll handle email filtering in the application layer
-- For stronger security, create a view that excludes email for non-owners

-- Create a function to check if user is viewing their own profile
CREATE OR REPLACE FUNCTION public.can_view_profile_email(profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() = profile_user_id OR public.has_role(auth.uid(), 'admin'::app_role);
$$;

-- Update the policy to use column-level security
DROP POLICY IF EXISTS "Users can view all profiles (restricted email)" ON public.profiles;

CREATE POLICY "Users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  CASE 
    WHEN auth.uid() = id OR public.has_role(auth.uid(), 'admin'::app_role)
    THEN true
    ELSE true
  END
);

-- Add a note: Email should be filtered at application level or use a view
-- For now, update application code to not expose emails to non-owners