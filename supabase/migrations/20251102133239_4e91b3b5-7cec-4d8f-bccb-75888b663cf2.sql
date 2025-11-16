-- Create site_settings table for About Us content
CREATE TABLE IF NOT EXISTS public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can view settings
CREATE POLICY "Anyone can view site settings"
  ON public.site_settings
  FOR SELECT
  USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update site settings"
  ON public.site_settings
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert settings
CREATE POLICY "Admins can insert site settings"
  ON public.site_settings
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default About Us content
INSERT INTO public.site_settings (key, value) VALUES
  ('about_us_title', 'About IEEE RAS ESPRIM SB'),
  ('about_us_content', 'We are a passionate community of robotics enthusiasts dedicated to innovation, learning, and competition. Our club brings together students from diverse backgrounds to collaborate on cutting-edge robotics projects and compete at national and international levels.')
ON CONFLICT (key) DO NOTHING;