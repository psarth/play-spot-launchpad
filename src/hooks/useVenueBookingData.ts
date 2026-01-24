import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Sport {
  id: string;
  name: string;
}

interface TableCourt {
  id: string;
  name: string;
  is_active: boolean;
}

interface VenueSport {
  id: string;
  sport_id: string;
  sport: Sport;
  price_per_hour: number;
  tables_courts: TableCourt[];
}

interface PaymentDetails {
  upi_id: string;
  qr_code_url: string | null;
}

interface Venue {
  id: string;
  name: string;
  description: string | null;
  location: string;
  address: string | null;
  price_per_hour: number;
  images: string[] | null;
  amenities: string[] | null;
  average_rating: number | null;
  total_reviews: number | null;
  venue_notes: string | null;
}

interface UseVenueBookingDataReturn {
  venue: Venue | null;
  venueSports: VenueSport[];
  paymentDetails: PaymentDetails | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useVenueBookingData = (venueId: string | undefined): UseVenueBookingDataReturn => {
  const [venue, setVenue] = useState<Venue | null>(null);
  const [venueSports, setVenueSports] = useState<VenueSport[]>([]);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!venueId) {
      setError("Venue ID is required");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch venue basic info
      const { data: venueData, error: venueError } = await supabase
        .from("venues")
        .select("*")
        .eq("id", venueId)
        .single();

      if (venueError) {
        setError("Venue not found");
        setLoading(false);
        return;
      }

      setVenue(venueData);

      // Fetch venue sports with tables/courts and price
      const { data: venueSportsData, error: vsError } = await supabase
        .from("venue_sports")
        .select(`
          id,
          sport_id,
          price_per_hour,
          sports:sport_id (id, name),
          tables_courts (id, name, is_active, display_order)
        `)
        .eq("venue_id", venueId);

      if (!vsError && venueSportsData) {
        const mapped: VenueSport[] = venueSportsData
          .filter((vs: any) => vs.sports)
          .map((vs: any) => ({
            id: vs.id,
            sport_id: vs.sport_id,
            sport: vs.sports,
            price_per_hour: vs.price_per_hour || 500,
            tables_courts: (vs.tables_courts || [])
              .filter((tc: any) => tc.is_active)
              .sort((a: any, b: any) => a.display_order - b.display_order),
          }));
        setVenueSports(mapped);
      }

      // Fetch payment details
      const { data: paymentData } = await supabase
        .from("venue_payment_details")
        .select("upi_id, qr_code_url")
        .eq("venue_id", venueId)
        .eq("is_active", true)
        .maybeSingle();

      setPaymentDetails(paymentData);
    } catch (err) {
      setError("Failed to load venue data");
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    venue,
    venueSports,
    paymentDetails,
    loading,
    error,
    refetch: fetchData,
  };
};

export default useVenueBookingData;
