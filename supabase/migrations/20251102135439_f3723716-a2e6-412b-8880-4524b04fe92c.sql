-- Create presences table for weekly attendance tracking
CREATE TABLE public.presences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  week_date DATE NOT NULL,
  present BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, week_date)
);

-- Enable RLS
ALTER TABLE public.presences ENABLE ROW LEVEL SECURITY;

-- Admins can manage all presences
CREATE POLICY "Admins can manage presences"
ON public.presences
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own presences
CREATE POLICY "Users can view own presences"
ON public.presences
FOR SELECT
USING (auth.uid() = user_id);