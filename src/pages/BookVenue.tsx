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

  if (!venue) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-secondary/30">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12">
        <Button 
          variant="outline" 
          onClick={() => navigate("/browse-venues")} 
          className="mb-8 rounded-xl"
        >
          ← Back to Venues
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Venue Details - Left Side */}
          <div className="lg:col-span-3">
            <Card className="overflow-hidden mb-6">
              {venue.images && venue.images[0] && (
                <div className="relative h-80 overflow-hidden">
                  <img
                    src={venue.images[0]}
                    alt={venue.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/95 to-transparent p-6">
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{venue.name}</h1>
                    <p className="flex items-center gap-2 text-white/90">
                      <MapPin className="h-5 w-5" />
                      {venue.location}
                    </p>
                  </div>
                </div>
              )}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>About This Venue</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground leading-relaxed">
                  {venue.description || "Premium sports facility with modern amenities."}
                </p>

                <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">₹</span>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-primary">₹{venue.price_per_hour}</p>
                    <p className="text-sm text-muted-foreground">per hour</p>
                  </div>
                </div>

                {venue.amenities && venue.amenities.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-lg mb-3">Amenities & Features</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {venue.amenities.map((amenity, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 bg-secondary rounded-lg">
                          <div className="h-2 w-2 rounded-full bg-primary"></div>
                          <span className="text-sm">{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Booking Form - Right Side */}
          <div className="lg:col-span-2">
            <Card className="sticky top-24">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
                <CardTitle className="text-2xl">Book This Venue</CardTitle>
                <CardDescription>Select your preferred date and time slot</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div>
                  <Label className="text-base font-semibold mb-3 block">Select Date</Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                    className="rounded-xl border shadow-sm"
                  />
                </div>

                {selectedDate && (
                  <div>
                    <Label className="text-base font-semibold mb-3 block">Available Time Slots</Label>
                    {timeSlots.length === 0 ? (
                      <div className="text-center py-8 bg-muted/50 rounded-lg">
                        <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                          No available slots for this date
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {timeSlots.map((slot) => (
                          <Button
                            key={slot.id}
                            variant={selectedSlot === slot.id ? "default" : "outline"}
                            onClick={() => setSelectedSlot(slot.id)}
                            className="flex flex-col items-center gap-1 h-auto py-3 rounded-xl"
                          >
                            <Clock className="h-4 w-4" />
                            <span className="text-xs font-semibold">
                              {slot.start_time.slice(0, 5)}
                            </span>
                            <span className="text-xs opacity-70">to</span>
                            <span className="text-xs font-semibold">
                              {slot.end_time.slice(0, 5)}
                            </span>
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <Label htmlFor="notes" className="text-base font-semibold">
                    Additional Notes <span className="text-muted-foreground font-normal">(Optional)</span>
                  </Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special requests or requirements..."
                    className="mt-2 rounded-xl min-h-[100px]"
                  />
                </div>

                <Button
                  onClick={handleBooking}
                  disabled={!selectedDate || !selectedSlot || loading}
                  className="w-full h-12 text-base font-semibold rounded-xl"
                  size="lg"
                >
                  {loading ? "Processing..." : "Confirm & Book"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BookVenue;
