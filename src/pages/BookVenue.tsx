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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Clock, Star, CheckCircle, ArrowLeft, CreditCard } from "lucide-react";

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
  sports: { name: string };
}

interface GeneratedSlot {
  start_time: string;
  end_time: string;
  label: string;
  isBooked: boolean;
}

const BookVenue = () => {
  const { venueId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [generatedSlots, setGeneratedSlots] = useState<GeneratedSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<GeneratedSlot | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [step, setStep] = useState<"select" | "confirm" | "success">("select");
  const [bookingResult, setBookingResult] = useState<any>(null);

  useEffect(() => {
    fetchVenue();
  }, [venueId]);

  useEffect(() => {
    if (selectedDate && venue) {
      generateTimeSlots();
    }
  }, [selectedDate, venue]);

  const fetchVenue = async () => {
    const { data, error } = await supabase
      .from("venues")
      .select(`
        *,
        sports:sport_id (name)
      `)
      .eq("id", venueId)
      .single();

    if (error) {
      toast({ title: "Error fetching venue", variant: "destructive" });
      navigate("/browse-venues");
    } else {
      setVenue(data);
    }
  };

  const generateTimeSlots = async () => {
    if (!selectedDate || !venue) return;
    setSlotsLoading(true);

    const dateStr = selectedDate.toISOString().split("T")[0];
    
    // Get already booked slots for this date
    const { data: bookedSlots } = await supabase
      .from("bookings")
      .select("start_time, end_time")
      .eq("venue_id", venueId)
      .eq("booking_date", dateStr)
      .in("status", ["confirmed", "pending"]);

    // Generate slots from 6 AM to 10 PM (1-hour slots)
    const slots: GeneratedSlot[] = [];
    for (let hour = 6; hour < 22; hour++) {
      const startHour = hour.toString().padStart(2, "0");
      const endHour = (hour + 1).toString().padStart(2, "0");
      const start_time = `${startHour}:00:00`;
      const end_time = `${endHour}:00:00`;

      // Check if slot is booked
      const isBooked = bookedSlots?.some(
        (b) => b.start_time === start_time || 
        (b.start_time < end_time && b.end_time > start_time)
      ) || false;

      // Check if slot is in the past for today
      const now = new Date();
      const isToday = selectedDate.toDateString() === now.toDateString();
      const isPast = isToday && hour <= now.getHours();

      slots.push({
        start_time,
        end_time,
        label: `${startHour}:00 - ${endHour}:00`,
        isBooked: isBooked || isPast,
      });
    }

    setGeneratedSlots(slots);
    setSelectedSlot(null);
    setSlotsLoading(false);
  };

  const handleProceedToConfirm = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Please login to book", variant: "destructive" });
      navigate("/login");
      return;
    }
    if (!selectedDate || !selectedSlot) {
      toast({ title: "Please select date and time", variant: "destructive" });
      return;
    }
    setStep("confirm");
  };

  const handleBooking = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !selectedDate || !selectedSlot || !venue) return;

    setLoading(true);

    const totalAmount = venue.price_per_hour;

    // Create booking
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        customer_id: user.id,
        venue_id: venueId,
        booking_date: selectedDate.toISOString().split("T")[0],
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        total_amount: totalAmount,
        notes: notes || null,
        status: "confirmed",
        payment_status: "completed",
        payment_intent_id: `demo_${Date.now()}`,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Booking failed", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Create payment record
    await supabase.from("payments").insert({
      booking_id: data.id,
      amount: totalAmount,
      status: "completed",
      payment_method: "demo",
      transaction_id: `demo_txn_${Date.now()}`,
    });

    setBookingResult({
      ...data,
      venue_name: venue.name,
      venue_location: venue.location,
      slot_label: selectedSlot.label,
    });
    setStep("success");
    setLoading(false);
  };

  if (!venue) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
        <p className="text-muted-foreground">Loading venue details...</p>
      </div>
    </div>
  );

  // Success Step
  if (step === "success" && bookingResult) {
    return (
      <div className="min-h-screen flex flex-col bg-secondary/30">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center">
          <Card className="max-w-lg w-full text-center">
            <CardContent className="pt-8 pb-8">
              <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Booking Confirmed! 🎉</h2>
              <p className="text-muted-foreground mb-6">Your booking has been successfully confirmed.</p>
              
              <div className="bg-muted/50 rounded-xl p-4 mb-6 text-left space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Venue</span>
                  <span className="font-semibold">{bookingResult.venue_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-semibold">{new Date(bookingResult.booking_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-semibold">{bookingResult.slot_label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="font-semibold text-green-600">₹{bookingResult.total_amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booking ID</span>
                  <span className="font-mono text-xs">{bookingResult.id.slice(0, 8)}...</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button onClick={() => navigate("/my-bookings")} className="w-full">
                  View My Bookings
                </Button>
                <Button variant="outline" onClick={() => navigate("/browse-venues")} className="w-full">
                  Browse More Venues
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Confirm Step
  if (step === "confirm") {
    return (
      <div className="min-h-screen flex flex-col bg-secondary/30">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-12">
          <Button 
            variant="ghost" 
            onClick={() => setStep("select")} 
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Selection
          </Button>

          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <CreditCard className="h-6 w-6" />
                  Confirm Your Booking
                </CardTitle>
                <CardDescription>Review your booking details before payment</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Booking Summary */}
                <div className="bg-muted/50 rounded-xl p-5 space-y-4">
                  <h3 className="font-semibold text-lg">{venue.name}</h3>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {venue.location}
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-semibold">{selectedDate?.toLocaleDateString("en-IN", { 
                        weekday: "long", 
                        year: "numeric", 
                        month: "long", 
                        day: "numeric" 
                      })}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Time Slot</p>
                      <p className="font-semibold">{selectedSlot?.label}</p>
                    </div>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="border rounded-xl p-5 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hourly Rate</span>
                    <span>₹{venue.price_per_hour}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration</span>
                    <span>1 hour</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between text-lg font-bold">
                    <span>Total Amount</span>
                    <span className="text-primary">₹{venue.price_per_hour}</span>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="notes" className="text-base font-semibold">
                    Additional Notes <span className="text-muted-foreground font-normal">(Optional)</span>
                  </Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special requests or requirements..."
                    className="mt-2 rounded-xl min-h-[80px]"
                  />
                </div>

                {/* Pay Button */}
                <Button
                  onClick={handleBooking}
                  disabled={loading}
                  className="w-full h-14 text-lg font-semibold rounded-xl"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-r-transparent mr-2" />
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5 mr-2" />
                      Pay ₹{venue.price_per_hour} & Confirm
                    </>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  🔒 Demo mode - No actual charges will be made
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Selection Step (Default)
  return (
    <div className="min-h-screen flex flex-col bg-secondary/30">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12">
        <Button 
          variant="outline" 
          onClick={() => navigate("/browse-venues")} 
          className="mb-8 rounded-xl"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Venues
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Venue Details - Left Side */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="overflow-hidden">
              {venue.images && venue.images[0] ? (
                <div className="relative h-72 md:h-80 overflow-hidden">
                  <img
                    src={venue.images[0]}
                    alt={venue.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/95 to-transparent p-6">
                    <Badge className="mb-2">{venue.sports?.name}</Badge>
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{venue.name}</h1>
                    <p className="flex items-center gap-2 text-white/90">
                      <MapPin className="h-4 w-4" />
                      {venue.location}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-gradient-to-r from-primary/10 to-accent/10">
                  <Badge className="mb-2">{venue.sports?.name}</Badge>
                  <h1 className="text-2xl md:text-3xl font-bold mb-2">{venue.name}</h1>
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {venue.location}
                  </p>
                </div>
              )}
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>About This Venue</CardTitle>
                  {venue.average_rating && venue.average_rating > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-bold">{venue.average_rating}</span>
                      <span className="text-muted-foreground">({venue.total_reviews} reviews)</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground leading-relaxed">
                  {venue.description || "Premium sports facility with modern amenities and excellent playing conditions."}
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
                    <div className="flex flex-wrap gap-2">
                      {venue.amenities.map((amenity, index) => (
                        <Badge key={index} variant="secondary" className="px-3 py-1">
                          {amenity}
                        </Badge>
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
                <CardTitle className="text-xl">Book This Venue</CardTitle>
                <CardDescription>Select your preferred date and time slot</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-6">
                {/* Step 1: Select Date */}
                <div>
                  <Label className="text-sm font-semibold mb-2 block flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">1</span>
                    Select Date
                  </Label>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    className="rounded-xl border shadow-sm"
                  />
                </div>

                {/* Step 2: Select Time */}
                {selectedDate && (
                  <div className="animate-in slide-in-from-top-2 duration-300">
                    <Label className="text-sm font-semibold mb-3 block flex items-center gap-2">
                      <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">2</span>
                      Select Time Slot
                    </Label>
                    {slotsLoading ? (
                      <div className="text-center py-8 bg-muted/50 rounded-xl">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent mb-2"></div>
                        <p className="text-sm text-muted-foreground">Loading available slots...</p>
                      </div>
                    ) : generatedSlots.filter(s => !s.isBooked).length === 0 ? (
                      <div className="text-center py-8 bg-muted/50 rounded-xl">
                        <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                          No available slots for this date
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Please try another date
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 max-h-[280px] overflow-y-auto pr-1">
                        {generatedSlots.map((slot, idx) => (
                          <Button
                            key={idx}
                            variant={selectedSlot?.start_time === slot.start_time ? "default" : "outline"}
                            onClick={() => !slot.isBooked && setSelectedSlot(slot)}
                            disabled={slot.isBooked}
                            className={`h-auto py-2 px-2 text-xs rounded-lg ${
                              slot.isBooked ? "opacity-40 cursor-not-allowed line-through" : ""
                            }`}
                          >
                            {slot.label.split(" - ")[0]}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Summary */}
                {selectedSlot && (
                  <div className="bg-primary/5 rounded-xl p-4 border border-primary/20 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Selected</span>
                      <Badge variant="secondary">
                        {selectedDate?.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{selectedSlot.label}</span>
                      <span className="font-bold text-primary">₹{venue.price_per_hour}</span>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleProceedToConfirm}
                  disabled={!selectedDate || !selectedSlot}
                  className="w-full h-12 text-base font-semibold rounded-xl"
                  size="lg"
                >
                  Continue to Payment
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
