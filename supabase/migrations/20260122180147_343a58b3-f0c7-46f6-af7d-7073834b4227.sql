-- =============================================
-- SLOT LOCKING TABLE (Prevents double booking)
-- =============================================
CREATE TABLE public.slot_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  locked_by UUID NOT NULL,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'converted', 'expired', 'released')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create unique constraint to prevent overlapping locks
CREATE UNIQUE INDEX idx_slot_locks_unique_active 
ON public.slot_locks (venue_id, slot_date, start_time, end_time) 
WHERE status = 'active';

-- Create index for faster expiry checks
CREATE INDEX idx_slot_locks_expires ON public.slot_locks (expires_at) WHERE status = 'active';
CREATE INDEX idx_slot_locks_venue_date ON public.slot_locks (venue_id, slot_date);

-- Enable RLS
ALTER TABLE public.slot_locks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for slot_locks
CREATE POLICY "Anyone can view active slot locks" 
ON public.slot_locks FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create slot locks" 
ON public.slot_locks FOR INSERT 
WITH CHECK (auth.uid() = locked_by);

CREATE POLICY "Users can update their own locks" 
ON public.slot_locks FOR UPDATE 
USING (auth.uid() = locked_by);

CREATE POLICY "Users can delete their own locks" 
ON public.slot_locks FOR DELETE 
USING (auth.uid() = locked_by);

-- =============================================
-- PROVIDER BANK DETAILS TABLE
-- =============================================
CREATE TABLE public.provider_bank_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL UNIQUE,
  account_holder_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  ifsc_code TEXT NOT NULL,
  upi_id TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.provider_bank_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies for provider_bank_details
CREATE POLICY "Providers can view their own bank details" 
ON public.provider_bank_details FOR SELECT 
USING (auth.uid() = provider_id);

CREATE POLICY "Providers can insert their own bank details" 
ON public.provider_bank_details FOR INSERT 
WITH CHECK (auth.uid() = provider_id AND has_role(auth.uid(), 'provider'::app_role));

CREATE POLICY "Providers can update their own bank details" 
ON public.provider_bank_details FOR UPDATE 
USING (auth.uid() = provider_id);

CREATE POLICY "Admins can view all bank details" 
ON public.provider_bank_details FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all bank details" 
ON public.provider_bank_details FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- PLATFORM SETTINGS TABLE (Commission Config)
-- =============================================
CREATE TABLE public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default commission rate (10%)
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES ('platform_commission_percentage', '10', 'Platform commission percentage on each booking');

-- Insert slot lock duration (10 minutes)
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES ('slot_lock_duration_minutes', '10', 'How long a slot is locked during payment process');

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for platform_settings
CREATE POLICY "Anyone can view platform settings" 
ON public.platform_settings FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage platform settings" 
ON public.platform_settings FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- PAYOUTS TABLE (Provider Earnings)
-- =============================================
CREATE TABLE public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL,
  gross_amount DECIMAL(10, 2) NOT NULL,
  commission_amount DECIMAL(10, 2) NOT NULL,
  commission_percentage DECIMAL(5, 2) NOT NULL,
  net_amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payout_date TIMESTAMPTZ,
  transaction_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payouts
CREATE POLICY "Providers can view their own payouts" 
ON public.payouts FOR SELECT 
USING (auth.uid() = provider_id);

CREATE POLICY "Admins can view all payouts" 
ON public.payouts FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all payouts" 
ON public.payouts FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can create payouts" 
ON public.payouts FOR INSERT 
WITH CHECK (true);

-- =============================================
-- ADD COLUMNS TO EXISTING TABLES
-- =============================================

-- Add commission tracking to bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS platform_commission DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS provider_payout DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS commission_percentage DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS slot_lock_id UUID REFERENCES public.slot_locks(id);

-- =============================================
-- FUNCTION: Auto-release expired slot locks
-- =============================================
CREATE OR REPLACE FUNCTION public.release_expired_slot_locks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.slot_locks
  SET status = 'expired'
  WHERE status = 'active' AND expires_at < now();
END;
$$;

-- =============================================
-- FUNCTION: Create payout when booking confirmed
-- =============================================
CREATE OR REPLACE FUNCTION public.create_payout_on_booking_confirm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_commission_pct DECIMAL(5, 2);
  v_provider_id UUID;
  v_gross_amount DECIMAL(10, 2);
  v_commission_amount DECIMAL(10, 2);
  v_net_amount DECIMAL(10, 2);
BEGIN
  -- Only proceed if status changed to confirmed
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    -- Get commission percentage from settings
    SELECT CAST(setting_value AS DECIMAL(5, 2)) INTO v_commission_pct
    FROM public.platform_settings
    WHERE setting_key = 'platform_commission_percentage';
    
    IF v_commission_pct IS NULL THEN
      v_commission_pct := 10.00; -- Default 10%
    END IF;
    
    -- Get provider ID from venue
    SELECT provider_id INTO v_provider_id
    FROM public.venues
    WHERE id = NEW.venue_id;
    
    -- Calculate amounts
    v_gross_amount := NEW.total_amount;
    v_commission_amount := ROUND(v_gross_amount * v_commission_pct / 100, 2);
    v_net_amount := v_gross_amount - v_commission_amount;
    
    -- Update booking with commission info
    NEW.platform_commission := v_commission_amount;
    NEW.provider_payout := v_net_amount;
    NEW.commission_percentage := v_commission_pct;
    
    -- Create payout record
    INSERT INTO public.payouts (
      booking_id, provider_id, gross_amount, 
      commission_amount, commission_percentage, net_amount, status
    ) VALUES (
      NEW.id, v_provider_id, v_gross_amount, 
      v_commission_amount, v_commission_pct, v_net_amount, 'pending'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for payout creation
DROP TRIGGER IF EXISTS trigger_create_payout ON public.bookings;
CREATE TRIGGER trigger_create_payout
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.create_payout_on_booking_confirm();

-- =============================================
-- FUNCTION: Convert slot lock to booking
-- =============================================
CREATE OR REPLACE FUNCTION public.convert_slot_lock_to_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a booking is created with a slot_lock_id, mark the lock as converted
  IF NEW.slot_lock_id IS NOT NULL THEN
    UPDATE public.slot_locks
    SET status = 'converted', booking_id = NEW.id
    WHERE id = NEW.slot_lock_id AND status = 'active';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for slot lock conversion
DROP TRIGGER IF EXISTS trigger_convert_slot_lock ON public.bookings;
CREATE TRIGGER trigger_convert_slot_lock
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.convert_slot_lock_to_booking();

-- =============================================
-- Enable realtime for key tables
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.slot_locks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payouts;