import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Clock, MapPin, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LastBooking {
  id: string;
  venue_id: string;
  venue_name: string;
  venue_location: string;
  sport_name: string | null;
  booking_date: string;
  start_time: string;
}

export const RepeatBookingSection = () => {
  const navigate = useNavigate();
  const [lastBookings, setLastBookings] = useState<LastBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLastBookings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get last 3 unique venue bookings
      const { data } = await supabase
        .from("bookings")
        .select(`
          id,
          venue_id,
          booking_date,
          start_time,
          venues:venue_id (name, location)
        `)
        .eq("customer_id", user.id)
        .eq("status", "confirmed")
        .order("created_at", { ascending: false })
        .limit(10);

      if (data) {
        // Get unique venues
        const seenVenues = new Set<string>();
        const uniqueBookings: LastBooking[] = [];
        
        for (const booking of data) {
          if (!seenVenues.has(booking.venue_id) && uniqueBookings.length < 3) {
            seenVenues.add(booking.venue_id);
            const venue = booking.venues as any;
            uniqueBookings.push({
              id: booking.id,
              venue_id: booking.venue_id,
              venue_name: venue?.name || "Unknown Venue",
              venue_location: venue?.location || "",
              sport_name: null,
              booking_date: booking.booking_date,
              start_time: booking.start_time,
            });
          }
        }
        
        setLastBookings(uniqueBookings);
      }
      setLoading(false);
    };

    fetchLastBookings();
  }, []);

  if (loading || lastBookings.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <RefreshCw className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Book Again</h2>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {lastBookings.map((booking) => (
          <button
            key={booking.id}
            onClick={() => navigate(`/book-venue/${booking.venue_id}`)}
            className="flex-shrink-0 bg-card border border-border rounded-xl p-3 text-left hover:border-primary/50 transition-colors min-w-[200px] active:scale-[0.98]"
          >
            <p className="font-medium text-sm line-clamp-1 mb-1">
              {booking.venue_name}
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <MapPin className="h-3 w-3" />
              <span className="line-clamp-1">{booking.venue_location}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Last: {booking.start_time}
              </div>
              <ChevronRight className="h-4 w-4 text-primary" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RepeatBookingSection;
