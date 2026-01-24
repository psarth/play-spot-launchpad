-- =====================================================
-- MULTI-SPORT VENUE & TABLE/COURT BASED BOOKING SYSTEM
-- =====================================================

-- 1. Junction table for venue-sport relationships (multiple sports per venue)
CREATE TABLE public.venue_sports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  sport_id UUID NOT NULL REFERENCES public.sports(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(venue_id, sport_id)
);

-- 2. Tables/Courts for each sport in a venue
CREATE TABLE public.tables_courts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_sport_id UUID NOT NULL REFERENCES public.venue_sports(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Venue payment details (UPI + QR per venue)
CREATE TABLE public.venue_payment_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE UNIQUE,
  upi_id TEXT NOT NULL,
  qr_code_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Update time_slots to reference table/court instead of venue directly
ALTER TABLE public.time_slots 
ADD COLUMN table_court_id UUID REFERENCES public.tables_courts(id) ON DELETE CASCADE;

-- 5. Update slot_locks to reference table/court
ALTER TABLE public.slot_locks
ADD COLUMN table_court_id UUID REFERENCES public.tables_courts(id) ON DELETE CASCADE;

-- 6. Update bookings to reference table/court
ALTER TABLE public.bookings
ADD COLUMN table_court_id UUID REFERENCES public.tables_courts(id) ON DELETE SET NULL;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- venue_sports RLS
ALTER TABLE public.venue_sports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view venue sports"
ON public.venue_sports FOR SELECT
USING (true);

CREATE POLICY "Providers can manage their venue sports"
ON public.venue_sports FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.venues
    WHERE venues.id = venue_sports.venue_id
    AND venues.provider_id = auth.uid()
    AND has_role(auth.uid(), 'provider'::app_role)
  )
);

CREATE POLICY "Admins can manage all venue sports"
ON public.venue_sports FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- tables_courts RLS
ALTER TABLE public.tables_courts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tables courts"
ON public.tables_courts FOR SELECT
USING (true);

CREATE POLICY "Providers can manage their tables courts"
ON public.tables_courts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.venue_sports vs
    JOIN public.venues v ON v.id = vs.venue_id
    WHERE vs.id = tables_courts.venue_sport_id
    AND v.provider_id = auth.uid()
    AND has_role(auth.uid(), 'provider'::app_role)
  )
);

CREATE POLICY "Admins can manage all tables courts"
ON public.tables_courts FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- venue_payment_details RLS
ALTER TABLE public.venue_payment_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active payment details"
ON public.venue_payment_details FOR SELECT
USING (is_active = true);

CREATE POLICY "Providers can manage their venue payment details"
ON public.venue_payment_details FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.venues
    WHERE venues.id = venue_payment_details.venue_id
    AND venues.provider_id = auth.uid()
    AND has_role(auth.uid(), 'provider'::app_role)
  )
);

CREATE POLICY "Admins can manage all payment details"
ON public.venue_payment_details FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE TRIGGER update_tables_courts_updated_at
BEFORE UPDATE ON public.tables_courts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_venue_payment_details_updated_at
BEFORE UPDATE ON public.venue_payment_details
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ENABLE REALTIME FOR NEW TABLES
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.venue_sports;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tables_courts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.venue_payment_details;