-- Add video background settings to site_settings
INSERT INTO public.site_settings (key, value) VALUES ('video_background_url', '')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_settings (key, value) VALUES ('video_background_type', 'none')
ON CONFLICT (key) DO NOTHING;