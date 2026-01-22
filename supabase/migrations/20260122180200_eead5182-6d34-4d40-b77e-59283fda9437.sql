-- Fix RLS Policy Always True warnings by making them more restrictive

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "System can create payouts" ON public.payouts;

-- Create more restrictive payout insert policy 
-- Payouts should only be created by system triggers, so we'll check that the provider exists
CREATE POLICY "Payouts can be created for valid bookings" 
ON public.payouts FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.venues v ON v.id = b.venue_id
    WHERE b.id = booking_id AND v.provider_id = provider_id
  )
);

-- Fix search_path for functions that don't have it set properly
-- (The functions I created already have SET search_path = public, so this is for other existing functions if any)