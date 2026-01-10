-- Create reviews table for rating system
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(booking_id)
);

-- Enable RLS on reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Reviews policies
CREATE POLICY "Anyone can view reviews"
ON public.reviews FOR SELECT
USING (true);

CREATE POLICY "Customers can create reviews for their bookings"
ON public.reviews FOR INSERT
WITH CHECK (
  auth.uid() = customer_id AND
  EXISTS (
    SELECT 1 FROM public.bookings
    WHERE bookings.id = booking_id
    AND bookings.customer_id = auth.uid()
    AND bookings.status = 'confirmed'
  )
);

CREATE POLICY "Customers can update their own reviews"
ON public.reviews FOR UPDATE
USING (auth.uid() = customer_id);

CREATE POLICY "Customers can delete their own reviews"
ON public.reviews FOR DELETE
USING (auth.uid() = customer_id);

-- Create trigger for reviews updated_at
CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add average_rating to venues (computed column would be better but we'll use a trigger)
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS average_rating DECIMAL(2,1) DEFAULT 0;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- Function to update venue rating when review is added/updated/deleted
CREATE OR REPLACE FUNCTION public.update_venue_rating()
RETURNS TRIGGER AS $$
DECLARE
  avg_rating DECIMAL(2,1);
  review_count INTEGER;
BEGIN
  -- Calculate new average
  SELECT 
    COALESCE(ROUND(AVG(rating)::numeric, 1), 0),
    COUNT(*)
  INTO avg_rating, review_count
  FROM public.reviews
  WHERE venue_id = COALESCE(NEW.venue_id, OLD.venue_id);

  -- Update venue
  UPDATE public.venues
  SET 
    average_rating = avg_rating,
    total_reviews = review_count
  WHERE id = COALESCE(NEW.venue_id, OLD.venue_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update venue rating
CREATE TRIGGER update_venue_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_venue_rating();

-- Enable realtime for reviews
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;