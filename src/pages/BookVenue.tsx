import { useState, useEffect, useCallback } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Clock, Star, CheckCircle, ArrowLeft, Smartphone, Shield, Copy, Check, CalendarDays, CreditCard, Lock, AlertTriangle, Dumbbell, Table2, QrCode } from "lucide-react";
import { useVenueBookingData } from "@/hooks/useVenueBookingData";
import { useTableCourtSlots } from "@/hooks/useTableCourtSlots";

interface GeneratedSlot {
  start_time: string;
  end_time: string;
  label: string;
  isBooked: boolean;
  isLocked: boolean;
  lockedByMe: boolean;
}

// Step Indicator Component
const StepIndicator = ({ currentStep }: { currentStep: number }) => {
  const steps = [
    { num: 1, label: "Select Venue", icon: MapPin },
    { num: 2, label: "Choose Sport", icon: Dumbbell },
    { num: 3, label: "Select Slot", icon: CalendarDays },
    { num: 4, label: "Payment", icon: CreditCard },
    { num: 5, label: "Confirmed", icon: CheckCircle },
  ];

  return (
    <div className="w-full mb-8 overflow-x-auto">
      <div className="flex items-center justify-between relative min-w-[500px]">
        {/* Progress Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted -z-10">
          <div 
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>
        
        {steps.map((step) => {
          const Icon = step.icon;
          const isCompleted = currentStep > step.num;
          const isCurrent = currentStep === step.num;
          
          return (
            <div key={step.num} className="flex flex-col items-center">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted 
                    ? "bg-primary text-primary-foreground" 
                    : isCurrent 
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20" 
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span className={`text-xs mt-2 font-medium text-center ${
                isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const BookVenue = () => {
  const { venueId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Venue data hook
  const { venue, venueSports, paymentDetails, loading: venueLoading, error: venueError } = useVenueBookingData(venueId);
  
  // Selection state
  const [selectedSportId, setSelectedSportId] = useState<string | null>(null);
  const [selectedTableCourtId, setSelectedTableCourtId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedSlot, setSelectedSlot] = useState<GeneratedSlot | null>(null);
  const [notes, setNotes] = useState("");
  
  // UI state
  const [step, setStep] = useState<"select" | "payment" | "success">("select");
  const [loading, setLoading] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [upiCopied, setUpiCopied] = useState(false);
  const [slotLockId, setSlotLockId] = useState<string | null>(null);
  const [lockTimeRemaining, setLockTimeRemaining] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  }, []);

  // Get slots for selected table/court
  const dateStr = selectedDate?.toISOString().split("T")[0] || null;
  const { slots: generatedSlots, loading: slotsLoading, refreshSlots } = useTableCourtSlots({
    tableCourtId: selectedTableCourtId,
    venueId: venueId || "",
    selectedDate: dateStr,
    currentUserId,
  });

  // Get selected sport's tables/courts
  const selectedSport = venueSports.find((vs) => vs.sport_id === selectedSportId);
  const tablesCourts = selectedSport?.tables_courts || [];

  // Reset selections when sport changes
  useEffect(() => {
    setSelectedTableCourtId(null);
    setSelectedSlot(null);
  }, [selectedSportId]);

  // Reset slot when table/court or date changes
  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedTableCourtId, selectedDate]);

  // Calculate current step number for indicator
  const getCurrentStepNumber = () => {
    if (step === "success") return 5;
    if (step === "payment") return 4;
    if (selectedSlot && selectedDate && selectedTableCourtId) return 3;
    if (selectedSportId) return 2;
    return 1;
  };

  const handleProceedToPayment = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Please login to book", variant: "destructive" });
      navigate("/login");
      return;
    }
    if (!selectedDate || !selectedSlot || !selectedTableCourtId) {
      toast({ title: "Please complete all selections", variant: "destructive" });
      return;
    }
    if (!paymentDetails) {
      toast({ title: "This venue has not set up payment details yet", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Release expired locks first
      try {
        await supabase.rpc("release_expired_slot_locks");
      } catch (e) {
        // Ignore if RPC doesn't exist
      }

      // Check if slot is already booked
      const { data: existingBooking } = await supabase
        .from("bookings")
        .select("id")
        .eq("venue_id", venueId)
        .eq("booking_date", dateStr)
        .eq("start_time", selectedSlot.start_time)
        .eq("table_court_id", selectedTableCourtId)
        .in("status", ["pending", "confirmed"])
        .maybeSingle();

      if (existingBooking) {
        toast({ title: "This slot has already been booked", variant: "destructive" });
        refreshSlots();
        setLoading(false);
        return;
      }

      // Check for existing lock by another user
      const { data: existingLock } = await supabase
        .from("slot_locks")
        .select("*")
        .eq("venue_id", venueId)
        .eq("slot_date", dateStr)
        .eq("start_time", selectedSlot.start_time)
        .eq("table_court_id", selectedTableCourtId)
        .eq("status", "active")
        .maybeSingle();

      if (existingLock && existingLock.locked_by !== user.id) {
        toast({ 
          title: "Slot is being booked by another user", 
          description: "Please try again in a few minutes or select a different slot.",
          variant: "destructive" 
        });
        setLoading(false);
        return;
      }

      // Create or reuse lock
      let lockId = existingLock?.id;
      if (!existingLock) {
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        const { data: newLock, error: lockError } = await supabase
          .from("slot_locks")
          .insert({
            venue_id: venueId,
            slot_date: dateStr,
            start_time: selectedSlot.start_time,
            end_time: selectedSlot.end_time,
            locked_by: user.id,
            expires_at: expiresAt,
            status: "active",
            table_court_id: selectedTableCourtId,
          })
          .select()
          .single();

        if (lockError) {
          toast({ 
            title: "Could not reserve slot", 
            description: "Please try again.",
            variant: "destructive" 
          });
          setLoading(false);
          return;
        }
        lockId = newLock.id;
        setLockTimeRemaining(600);
      } else {
        const remaining = Math.max(0, Math.floor((new Date(existingLock.expires_at).getTime() - Date.now()) / 1000));
        setLockTimeRemaining(remaining);
      }

      setSlotLockId(lockId || null);
      setStep("payment");
    } catch (error) {
      toast({ title: "An error occurred", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Timer countdown effect
  useEffect(() => {
    if (step !== "payment" || lockTimeRemaining <= 0) return;

    const timer = setInterval(() => {
      setLockTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          toast({ 
            title: "Slot reservation expired", 
            description: "Please select a slot again.",
            variant: "destructive" 
          });
          setStep("select");
          setSlotLockId(null);
          refreshSlots();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step, lockTimeRemaining, toast, refreshSlots]);

  const handleCopyUPI = () => {
    if (paymentDetails?.upi_id) {
      navigator.clipboard.writeText(paymentDetails.upi_id);
      setUpiCopied(true);
      toast({ title: "UPI ID copied!" });
      setTimeout(() => setUpiCopied(false), 2000);
    }
  };

  const handlePaymentConfirmation = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !selectedDate || !selectedSlot || !venue) return;

    setLoading(true);

    const totalAmount = venue.price_per_hour;
    const selectedTableCourt = tablesCourts.find((tc) => tc.id === selectedTableCourtId);

    const { data, error } = await supabase
      .from("bookings")
      .insert({
        customer_id: user.id,
        venue_id: venueId,
        booking_date: dateStr,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        total_amount: totalAmount,
        notes: notes || null,
        status: "pending",
        payment_status: "pending",
        table_court_id: selectedTableCourtId,
        slot_lock_id: slotLockId,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Booking failed", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    await supabase.from("payments").insert({
      booking_id: data.id,
      amount: totalAmount,
      status: "pending",
      payment_method: "upi",
    });

    // Update slot lock to converted
    if (slotLockId) {
      await supabase
        .from("slot_locks")
        .update({ status: "converted", booking_id: data.id })
        .eq("id", slotLockId);
    }

    setBookingResult({
      ...data,
      venue_name: venue.name,
      venue_location: venue.location,
      slot_label: selectedSlot.label,
      sport_name: selectedSport?.sport.name,
      table_court_name: selectedTableCourt?.name,
    });
    setStep("success");
    setLoading(false);
  };

  // Handle venue error
  if (venueError) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-12 pt-24">
          <Card className="max-w-md mx-auto text-center">
            <CardContent className="py-12">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Venue Not Found</h2>
              <p className="text-muted-foreground mb-4">{venueError}</p>
              <Button onClick={() => navigate("/browse-venues")}>
                Browse Venues
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Loading state
  if (venueLoading || !venue) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
          <p className="text-muted-foreground">Loading venue details...</p>
        </div>
      </div>
    );
  }

  // Success Step
  if (step === "success" && bookingResult) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-12 pt-24">
          <div className="max-w-lg mx-auto">
            <StepIndicator currentStep={5} />
            <Card className="text-center animate-scale-in">
              <CardContent className="pt-8 pb-8">
                <div className="h-20 w-20 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-10 w-10 text-primary" />
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
                  {bookingResult.sport_name && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sport</span>
                      <span className="font-semibold">{bookingResult.sport_name}</span>
                    </div>
                  )}
                  {bookingResult.table_court_name && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Table/Court</span>
                      <span className="font-semibold">{bookingResult.table_court_name}</span>
                    </div>
                  )}
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
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                      Pending Confirmation
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <Button onClick={() => navigate("/my-bookings")} className="w-full btn-press">
                    View My Bookings
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/browse-venues")} className="w-full">
                    Book More Venues
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Payment Step (UPI)
  if (step === "payment" && paymentDetails) {
    const selectedTableCourt = tablesCourts.find((tc) => tc.id === selectedTableCourtId);
    const minutes = Math.floor(lockTimeRemaining / 60);
    const seconds = lockTimeRemaining % 60;

    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-12 pt-24">
          <div className="max-w-2xl mx-auto">
            <StepIndicator currentStep={4} />
            
            <Button 
              variant="ghost" 
              onClick={() => setStep("select")} 
              className="mb-6"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Selection
            </Button>

            {/* Lock Timer */}
            <div className="mb-4 p-3 bg-warning/10 border border-warning/30 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-warning" />
                <span className="text-sm font-medium">Slot reserved for you</span>
              </div>
              <span className="font-mono font-bold text-warning">
                {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
              </span>
            </div>

            <Card className="animate-fade-in-up">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Smartphone className="h-6 w-6" />
                  Pay via UPI
                </CardTitle>
                <CardDescription>Complete your payment using any UPI app</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Booking Summary */}
                <div className="bg-muted/50 rounded-xl p-5 space-y-3">
                  <h3 className="font-semibold text-lg">{venue.name}</h3>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {venue.location}
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Sport</p>
                      <p className="font-semibold">{selectedSport?.sport.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Table/Court</p>
                      <p className="font-semibold">{selectedTableCourt?.name}</p>
                    </div>
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

                  {/* QR Code */}
                  {paymentDetails.qr_code_url && (
                    <div className="flex justify-center">
                      <div className="p-4 bg-white rounded-xl border-2 border-border">
                        <img 
                          src={paymentDetails.qr_code_url} 
                          alt="Payment QR Code" 
                          className="w-48 h-48 object-contain"
                        />
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-muted rounded-xl">
                    <p className="text-sm text-muted-foreground mb-2 text-center">
                      {paymentDetails.qr_code_url ? "Or pay to UPI ID" : "Pay to UPI ID"}
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <code className="text-lg font-mono font-semibold bg-background px-4 py-2 rounded-lg">
                        {paymentDetails.upi_id}
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCopyUPI}
                        className="btn-press"
                      >
                        {upiCopied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
                    <h4 className="font-semibold text-warning mb-2">Payment Instructions</h4>
                    <ol className="text-sm text-muted-foreground space-y-2">
                      <li>1. Open any UPI app (GPay, PhonePe, Paytm, etc.)</li>
                      <li>2. Scan the QR code or pay to the UPI ID above</li>
                      <li>3. Pay exactly ₹{venue.price_per_hour}</li>
                      <li>4. Click "I Have Paid" button below</li>
                      <li>5. Wait for venue owner to confirm your payment</li>
                    </ol>
                  </div>

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

                <Button
                  onClick={handlePaymentConfirmation}
                  disabled={loading}
                  className="w-full h-14 text-lg font-semibold rounded-xl btn-press"
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
        <StepIndicator currentStep={getCurrentStepNumber()} />
        
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
            <Card className="overflow-hidden animate-fade-in-up">
              {venue.images && venue.images[0] ? (
                <div className="relative h-72 md:h-80 overflow-hidden">
                  <img
                    src={venue.images[0]}
                    alt={venue.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-secondary/95 to-transparent p-6">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {venueSports.map((vs) => (
                        <Badge key={vs.id} className="bg-primary">{vs.sport.name}</Badge>
                      ))}
                      <Badge className="verified-badge">
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
                <div className="p-6 bg-gradient-to-r from-primary/10 to-accent/10">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {venueSports.map((vs) => (
                      <Badge key={vs.id} className="bg-primary">{vs.sport.name}</Badge>
                    ))}
                    <Badge className="verified-badge">
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

            <Card className="animate-fade-in-up delay-100">
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

                {venue.venue_notes && (
                  <div className="bg-muted/50 rounded-xl p-4">
                    <h3 className="font-semibold text-lg mb-2">Venue Rules & Notes</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {venue.venue_notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Booking Form - Right Side */}
          <div className="lg:col-span-2">
            <Card className="sticky top-24 animate-fade-in-up delay-200">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b">
                <CardTitle className="text-xl flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Book This Venue
                </CardTitle>
                <CardDescription>Select sport, table/court, date and time</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* No payment details warning */}
                {!paymentDetails && (
                  <div className="p-4 bg-warning/10 border border-warning/30 rounded-xl">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                      <div>
                        <p className="font-medium text-warning">Payment Not Set Up</p>
                        <p className="text-sm text-muted-foreground">
                          This venue hasn't set up payment details yet. Booking is not available.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* No sports configured warning */}
                {venueSports.length === 0 && (
                  <div className="p-4 bg-warning/10 border border-warning/30 rounded-xl">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                      <div>
                        <p className="font-medium text-warning">Sports Not Configured</p>
                        <p className="text-sm text-muted-foreground">
                          This venue hasn't configured sports and tables/courts yet.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 1: Select Sport */}
                {venueSports.length > 0 && (
                  <div>
                    <Label className="text-base font-semibold mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">1</span>
                      Select Sport
                    </Label>
                    <Select
                      value={selectedSportId || ""}
                      onValueChange={setSelectedSportId}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Choose a sport" />
                      </SelectTrigger>
                      <SelectContent>
                        {venueSports.map((vs) => (
                          <SelectItem key={vs.sport_id} value={vs.sport_id}>
                            <div className="flex items-center gap-2">
                              <Dumbbell className="h-4 w-4" />
                              {vs.sport.name} ({vs.tables_courts.length} available)
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Step 2: Select Table/Court */}
                {selectedSportId && tablesCourts.length > 0 && (
                  <div className="animate-fade-in">
                    <Label className="text-base font-semibold mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">2</span>
                      Select Table/Court
                    </Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {tablesCourts.map((tc) => (
                        <button
                          key={tc.id}
                          onClick={() => setSelectedTableCourtId(tc.id)}
                          className={`p-3 rounded-lg text-sm font-medium transition-all border btn-press flex items-center gap-2 justify-center ${
                            selectedTableCourtId === tc.id
                              ? "bg-primary text-primary-foreground border-primary shadow-md"
                              : "bg-background hover:bg-primary/10 hover:border-primary/50"
                          }`}
                        >
                          <Table2 className="h-4 w-4" />
                          {tc.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3: Select Date */}
                {selectedTableCourtId && (
                  <div className="animate-fade-in">
                    <Label className="text-base font-semibold mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">3</span>
                      Select Date
                    </Label>
                    <div className="border rounded-xl p-3 flex justify-center mt-2">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                )}

                {/* Step 4: Select Time Slot */}
                {selectedDate && selectedTableCourtId && (
                  <div className="animate-fade-in">
                    <Label className="text-base font-semibold mb-3 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">4</span>
                      Select Time Slot
                    </Label>
                    {slotsLoading ? (
                      <div className="text-center py-8">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent"></div>
                        <p className="mt-2 text-sm text-muted-foreground">Loading available slots...</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1 mt-2">
                        {generatedSlots.map((slot) => {
                          const isUnavailable = slot.isBooked || slot.isLocked;
                          return (
                            <button
                              key={slot.start_time}
                              onClick={() => !isUnavailable && setSelectedSlot(slot)}
                              disabled={isUnavailable}
                              className={`p-3 rounded-lg text-sm font-medium transition-all border btn-press relative ${
                                isUnavailable
                                  ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                                  : selectedSlot?.start_time === slot.start_time
                                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                                  : "bg-background hover:bg-primary/10 hover:border-primary/50"
                              }`}
                            >
                              {slot.label}
                              {slot.isBooked && (
                                <span className="absolute top-1 right-1">
                                  <Badge variant="secondary" className="text-[10px] px-1 py-0">Booked</Badge>
                                </span>
                              )}
                              {slot.isLocked && !slot.isBooked && (
                                <span className="absolute top-1 right-1">
                                  <Lock className="h-3 w-3 text-warning" />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Price Summary */}
                {selectedSlot && (
                  <div className="border rounded-xl p-4 space-y-2 bg-muted/30 animate-scale-in">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sport</span>
                      <span className="font-medium">{selectedSport?.sport.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Table/Court</span>
                      <span className="font-medium">{tablesCourts.find(tc => tc.id === selectedTableCourtId)?.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Date</span>
                      <span className="font-medium">{selectedDate?.toLocaleDateString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Time</span>
                      <span className="font-medium">{selectedSlot.label}</span>
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
                  disabled={!selectedDate || !selectedSlot || !selectedTableCourtId || !paymentDetails || loading}
                  className="w-full h-12 text-base font-semibold rounded-xl btn-press"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-r-transparent mr-2" />
                      Reserving Slot...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5 mr-2" />
                      Proceed to Payment
                    </>
                  )}
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
