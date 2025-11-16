-- Add video background settings to site_settings
INSERT INTO public.site_settings (key, value) VALUES ('video_background_url', 'Futuristic_Robotics_Club_Video_Creation.mp4')
ON CONFLICT (key) DO UPDATE SET value = 'Futuristic_Robotics_Club_Video_Creation.mp4';

INSERT INTO public.site_settings (key, value) VALUES ('video_background_type', 'local')
ON CONFLICT (key) DO UPDATE SET value = 'local';