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
import { MapPin, Clock, Star, CheckCircle, ArrowLeft, Smartphone, Shield, Copy, Check } from "lucide-react";

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

// UPI Details - Replace with actual venue owner's UPI
const UPI_ID = "sportspot@upi";

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
  const [step, setStep] = useState<"select" | "payment" | "success">("select");
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [upiCopied, setUpiCopied] = useState(false);

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
      .in("status", ["confirmed", "pending_confirmation", "pending_payment"]);

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

  const handleProceedToPayment = async () => {
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
    setStep("payment");
  };

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(UPI_ID);
    setUpiCopied(true);
    toast({ title: "UPI ID copied!" });
    setTimeout(() => setUpiCopied(false), 2000);
  };

  const handlePaymentConfirmation = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !selectedDate || !selectedSlot || !venue) return;

    setLoading(true);

    const totalAmount = venue.price_per_hour;

    // Create booking with pending_confirmation status
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
        status: "pending_confirmation",
        payment_status: "pending",
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Booking failed", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Create payment record for verification
    await supabase.from("payments").insert({
      booking_id: data.id,
      amount: totalAmount,
      status: "pending",
      payment_method: "upi",
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
      <div className="min-h-screen flex flex-col bg-muted/30">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-12 pt-24 flex items-center justify-center">
          <Card className="max-w-lg w-full text-center">
            <CardContent className="pt-8 pb-8">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Clock className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Booking Submitted! 🎉</h2>
              <p className="text-muted-foreground mb-6">
                Your booking is pending confirmation. The venue owner will verify your payment and confirm shortly.
              </p>
              
              <div className="bg-muted/50 rounded-xl p-4 mb-6 text-left space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Venue</span>
                  <span className="font-semibold">{bookingResult.venue_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-semibold">{new Date(bookingResult.booking_date).toLocaleDateString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-semibold">{bookingResult.slot_label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold">₹{bookingResult.total_amount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                    Pending Confirmation
                  </Badge>
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

  // Payment Step (UPI)
  if (step === "payment") {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-12 pt-24">
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
              <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Smartphone className="h-6 w-6" />
                  Pay via UPI
                </CardTitle>
                <CardDescription>Complete your payment using any UPI app</CardDescription>
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
                        weekday: "short", 
                        year: "numeric", 
                        month: "short", 
                        day: "numeric" 
                      })}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Time Slot</p>
                      <p className="font-semibold">{selectedSlot?.label}</p>
                    </div>
                  </div>
                </div>

                {/* Amount */}
                <div className="text-center p-6 bg-primary/5 rounded-xl border-2 border-primary/20">
                  <p className="text-sm text-muted-foreground mb-1">Amount to Pay</p>
                  <p className="text-4xl font-bold text-primary">₹{venue.price_per_hour}</p>
                </div>

                {/* UPI Payment Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4 text-primary" />
                    Secure UPI Payment
                  </div>

                  {/* UPI ID */}
                  <div className="p-4 bg-muted rounded-xl">
                    <p className="text-sm text-muted-foreground mb-2 text-center">Pay to UPI ID</p>
                    <div className="flex items-center justify-center gap-2">
                      <code className="text-lg font-mono font-semibold bg-background px-4 py-2 rounded-lg">
                        {UPI_ID}
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCopyUPI}
                      >
                        {upiCopied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Payment Instructions */}
                  <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
                    <h4 className="font-semibold text-warning mb-2">Payment Instructions</h4>
                    <ol className="text-sm text-muted-foreground space-y-2">
                      <li>1. Open any UPI app (GPay, PhonePe, Paytm, etc.)</li>
                      <li>2. Pay ₹{venue.price_per_hour} to the UPI ID above</li>
                      <li>3. Click "I Have Paid" button below</li>
                      <li>4. Wait for venue owner to confirm your payment</li>
                    </ol>
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
                </div>

                {/* Confirm Button */}
                <Button
                  onClick={handlePaymentConfirmation}
                  disabled={loading}
                  className="w-full h-14 text-lg font-semibold rounded-xl"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-r-transparent mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      I Have Paid ₹{venue.price_per_hour}
                    </>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Your booking will be confirmed once the venue owner verifies your payment
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
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 pt-24">
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
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/95 to-transparent p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-primary">{venue.sports?.name}</Badge>
                      <Badge variant="outline" className="bg-background/80 text-foreground border-0">
                        <Shield className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{venue.name}</h1>
                    <p className="flex items-center gap-2 text-white/90">
                      <MapPin className="h-4 w-4" />
                      {venue.location}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-gradient-to-r from-primary/10 to-primary/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-primary">{venue.sports?.name}</Badge>
                    <Badge variant="outline">
                      <Shield className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  </div>
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
                      <Star className="h-5 w-5 fill-warning text-warning" />
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
                  <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                    <Smartphone className="h-4 w-4" />
                    UPI Accepted
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
              <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
                <CardTitle className="text-xl">Book This Venue</CardTitle>
                <CardDescription>Select your preferred date and time slot</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Step 1: Select Date */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">
                    1. Select Date
                  </Label>
                  <div className="border rounded-xl p-3 flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                {/* Step 2: Select Time Slot */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">
                    2. Select Time Slot
                  </Label>
                  {!selectedDate ? (
                    <div className="text-center py-8 text-muted-foreground border rounded-xl bg-muted/30">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Please select a date first</p>
                    </div>
                  ) : slotsLoading ? (
                    <div className="text-center py-8">
                      <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent"></div>
                      <p className="mt-2 text-sm text-muted-foreground">Loading available slots...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1">
                      {generatedSlots.map((slot) => (
                        <button
                          key={slot.start_time}
                          onClick={() => !slot.isBooked && setSelectedSlot(slot)}
                          disabled={slot.isBooked}
                          className={`p-3 rounded-lg text-sm font-medium transition-all border ${
                            slot.isBooked
                              ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                              : selectedSlot?.start_time === slot.start_time
                              ? "bg-primary text-primary-foreground border-primary shadow-md"
                              : "bg-background hover:bg-primary/10 hover:border-primary/50"
                          }`}
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Price Summary */}
                {selectedSlot && (
                  <div className="border rounded-xl p-4 space-y-2 bg-muted/30">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Selected Slot</span>
                      <span className="font-medium">{selectedSlot.label}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Date</span>
                      <span className="font-medium">{selectedDate?.toLocaleDateString("en-IN")}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">₹{venue.price_per_hour}</span>
                    </div>
                  </div>
                )}

                {/* Proceed Button */}
                <Button
                  onClick={handleProceedToPayment}
                  disabled={!selectedDate || !selectedSlot}
                  className="w-full h-12 text-base font-semibold rounded-xl"
                  size="lg"
                >
                  Proceed to Payment
                </Button>

                {/* Trust Indicators */}
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Smartphone className="h-3 w-3" />
                    UPI Accepted
                  </div>
                  <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Verified Venue
                  </div>
                </div>
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