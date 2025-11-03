-- Add description and social links to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS instagram_url TEXT;