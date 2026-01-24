-- Add price_per_hour column to venue_sports table for per-sport pricing
ALTER TABLE public.venue_sports 
ADD COLUMN IF NOT EXISTS price_per_hour DECIMAL(10, 2) NOT NULL DEFAULT 500;

-- Add comment explaining the column
COMMENT ON COLUMN public.venue_sports.price_per_hour IS 'Price per hour for this sport at this venue';