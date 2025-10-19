-- Create sports/categories table
CREATE TABLE public.sports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create venues/grounds table
CREATE TABLE public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL,
  sport_id UUID NOT NULL REFERENCES public.sports(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  address TEXT,
  price_per_hour DECIMAL(10, 2) NOT NULL,
  amenities TEXT[],
  images TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create time slots table
CREATE TABLE public.time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(venue_id, date, start_time)
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
  payment_intent_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'usd',
  payment_method TEXT,
  payment_intent_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Sports policies (public read)
CREATE POLICY "Anyone can view sports"
  ON public.sports FOR SELECT
  USING (true);

-- Venues policies
CREATE POLICY "Anyone can view active venues"
  ON public.venues FOR SELECT
  USING (is_active = true);

CREATE POLICY "Providers can insert their own venues"
  ON public.venues FOR INSERT
  WITH CHECK (auth.uid() = provider_id AND public.has_role(auth.uid(), 'provider'));

CREATE POLICY "Providers can update their own venues"
  ON public.venues FOR UPDATE
  USING (auth.uid() = provider_id AND public.has_role(auth.uid(), 'provider'));

CREATE POLICY "Providers can delete their own venues"
  ON public.venues FOR DELETE
  USING (auth.uid() = provider_id AND public.has_role(auth.uid(), 'provider'));

-- Time slots policies
CREATE POLICY "Anyone can view available time slots"
  ON public.time_slots FOR SELECT
  USING (true);

CREATE POLICY "Providers can manage time slots for their venues"
  ON public.time_slots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.venues
      WHERE venues.id = time_slots.venue_id
      AND venues.provider_id = auth.uid()
      AND public.has_role(auth.uid(), 'provider')
    )
  );

-- Bookings policies
CREATE POLICY "Users can view their own bookings"
  ON public.bookings FOR SELECT
  USING (
    auth.uid() = customer_id 
    OR EXISTS (
      SELECT 1 FROM public.venues
      WHERE venues.id = bookings.venue_id
      AND venues.provider_id = auth.uid()
    )
  );

CREATE POLICY "Customers can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update their own bookings"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = customer_id);

CREATE POLICY "Providers can update bookings for their venues"
  ON public.bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.venues
      WHERE venues.id = bookings.venue_id
      AND venues.provider_id = auth.uid()
      AND public.has_role(auth.uid(), 'provider')
    )
  );

-- Transactions policies
CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = transactions.booking_id
      AND (
        bookings.customer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.venues
          WHERE venues.id = bookings.venue_id
          AND venues.provider_id = auth.uid()
        )
      )
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_venues_updated_at
  BEFORE UPDATE ON public.venues
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default sports
INSERT INTO public.sports (name, description, icon) VALUES
  ('Cricket', 'Cricket grounds and pitches', 'Cricket'),
  ('Football', 'Football fields and turfs', 'Goal'),
  ('Badminton', 'Badminton courts', 'TrendingUp'),
  ('Snooker', 'Snooker and pool tables', 'Circle'),
  ('Tennis', 'Tennis courts', 'Circle'),
  ('Basketball', 'Basketball courts', 'Circle');