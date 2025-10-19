import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Clock } from "lucide-react";

interface Venue {
  id: string;
  name: string;
  description: string | null;
  location: string;
  address: string | null;
  price_per_hour: number;
  images: string[] | null;
  amenities: string[] | null;
}

interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const BookVenue = () => {
  const { venueId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchVenue();
  }, [venueId]);

  useEffect(() => {
    if (selectedDate) {
      fetchTimeSlots();
    }
  }, [selectedDate]);

  const fetchVenue = async () => {
    const { data, error } = await supabase
      .from("venues")
      .select("*")
      .eq("id", venueId)
      .single();

    if (error) {
      toast({ title: "Error fetching venue", variant: "destructive" });
      navigate("/browse-venues");
    } else {
      setVenue(data);
    }
  };

  const fetchTimeSlots = async () => {
    if (!selectedDate) return;

    const dateStr = selectedDate.toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("time_slots")
      .select("*")
      .eq("venue_id", venueId)
      .eq("date", dateStr)
      .eq("is_available", true);

    if (error) {
      toast({ title: "Error fetching time slots", variant: "destructive" });
    } else {
      setTimeSlots(data || []);
    }
  };

  const handleBooking = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({ title: "Please login to book", variant: "destructive" });
      navigate("/login");
      return;
    }

    if (!selectedDate || !selectedSlot || !venue) {
      toast({ title: "Please select date and time", variant: "destructive" });
      return;
    }

    setLoading(true);

    const slot = timeSlots.find((s) => s.id === selectedSlot);
    if (!slot) return;

    const startTime = new Date(`${selectedDate.toISOString().split("T")[0]}T${slot.start_time}`);
    const endTime = new Date(`${selectedDate.toISOString().split("T")[0]}T${slot.end_time}`);
    const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    const totalAmount = venue.price_per_hour * hours;

    const { data, error } = await supabase
      .from("bookings")
      .insert({
        customer_id: user.id,
        venue_id: venueId,
        booking_date: selectedDate.toISOString().split("T")[0],
        start_time: slot.start_time,
        end_time: slot.end_time,
        total_amount: totalAmount,
        notes: notes || null,
        status: "confirmed",
        payment_status: "pending",
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Booking failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Booking successful!", description: "Your booking has been confirmed." });
      navigate("/my-bookings");
    }

    setLoading(false);
  };

  if (!venue) return <div>Loading...</div>;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Button variant="outline" onClick={() => navigate("/browse-venues")} className="mb-6">
          ← Back to Venues
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            {venue.images && venue.images[0] && (
              <img
                src={venue.images[0]}
                alt={venue.name}
                className="w-full h-64 object-cover rounded-lg mb-4"
              />
            )}
            <h1 className="text-3xl font-bold mb-2">{venue.name}</h1>
            <p className="flex items-center gap-2 text-muted-foreground mb-4">
              <MapPin className="h-5 w-5" />
              {venue.location}
            </p>
            <p className="text-muted-foreground mb-4">{venue.description}</p>
            <p className="text-2xl font-bold mb-4">₹{venue.price_per_hour}/hour</p>
            {venue.amenities && venue.amenities.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {venue.amenities.map((amenity, index) => (
                    <span key={index} className="bg-secondary px-3 py-1 rounded">
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Book This Venue</CardTitle>
              <CardDescription>Select date and time for your booking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Select Date</Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border"
                />
              </div>

              {selectedDate && (
                <div>
                  <Label>Select Time Slot</Label>
                  {timeSlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground mt-2">
                      No available slots for this date
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {timeSlots.map((slot) => (
                        <Button
                          key={slot.id}
                          variant={selectedSlot === slot.id ? "default" : "outline"}
                          onClick={() => setSelectedSlot(slot.id)}
                          className="flex items-center gap-2"
                        >
                          <Clock className="h-4 w-4" />
                          {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special requests or notes..."
                  className="mt-2"
                />
              </div>

              <Button
                onClick={handleBooking}
                disabled={!selectedDate || !selectedSlot || loading}
                className="w-full"
              >
                {loading ? "Booking..." : "Confirm Booking"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BookVenue;
