-- Add venue verification and notes fields
ALTER TABLE public.venues 
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
ADD COLUMN IF NOT EXISTS venue_notes text;

-- Create storage bucket for venue images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('venue-images', 'venue-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for venue images
CREATE POLICY "Anyone can view venue images"
ON storage.objects FOR SELECT
USING (bucket_id = 'venue-images');

CREATE POLICY "Providers can upload venue images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'venue-images' 
  AND auth.role() = 'authenticated'
  AND public.has_role(auth.uid(), 'provider')
);

CREATE POLICY "Providers can update their venue images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'venue-images' 
  AND auth.role() = 'authenticated'
  AND public.has_role(auth.uid(), 'provider')
);

CREATE POLICY "Providers can delete their venue images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'venue-images' 
  AND auth.role() = 'authenticated'
  AND public.has_role(auth.uid(), 'provider')
);

-- Update RLS for venues to filter by verification status for public viewing
DROP POLICY IF EXISTS "Anyone can view active venues" ON public.venues;

CREATE POLICY "Anyone can view active verified venues"
ON public.venues
FOR SELECT
USING (is_active = true AND (verification_status = 'verified' OR verification_status IS NULL OR verification_status = 'pending'));

-- Providers can view all their own venues regardless of status
CREATE POLICY "Providers can view all their venues"
ON public.venues
FOR SELECT
USING (auth.uid() = provider_id AND public.has_role(auth.uid(), 'provider'));