import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin, Star, Receipt, AlertCircle, Smartphone, CheckCircle } from "lucide-react";
import ReviewDialog from "@/components/customer/ReviewDialog";
import PaymentReceipt from "@/components/customer/PaymentReceipt";
import { StatusBadge } from "@/components/StatusBadge";

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_amount: number;
  status: string;
  payment_status: string;
  payment_intent_id: string | null;
  notes: string | null;
  venues: {
    id: string;
    name: string;
    location: string;
  };
}

interface Review {
  booking_id: string;
  rating: number;
}

const MyBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; booking: Booking | null }>({ open: false, booking: null });
  const [receiptDialog, setReceiptDialog] = useState<{ open: boolean; booking: Booking | null }>({ open: false, booking: null });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuthAndFetchBookings();
  }, []);

  const checkAuthAndFetchBookings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/login");
      return;
    }

    await Promise.all([fetchBookings(user.id), fetchReviews(user.id)]);
  };

  const fetchBookings = async (userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        venues:venue_id (id, name, location)
      `)
      .eq("customer_id", userId)
      .order("booking_date", { ascending: false });

    if (error) {
      toast({ title: "Error fetching bookings", variant: "destructive" });
    } else {
      setBookings(data || []);
    }
    setLoading(false);
  };

  const fetchReviews = async (userId: string) => {
    const { data } = await supabase
      .from("reviews")
      .select("booking_id, rating")
      .eq("customer_id", userId);

    setReviews(data || []);
  };

  const cancelBooking = async (bookingId: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);

    if (error) {
      toast({ title: "Error cancelling booking", variant: "destructive" });
    } else {
      toast({ title: "Booking cancelled successfully" });
      const { data: { user } } = await supabase.auth.getUser();
      if (user) fetchBookings(user.id);
    }
  };

  const isUpcoming = (booking: Booking) => {
    const bookingDate = new Date(booking.booking_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return bookingDate >= today && booking.status !== "cancelled";
  };

  const isPast = (booking: Booking) => {
    const bookingDate = new Date(booking.booking_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return bookingDate < today || booking.status === "cancelled";
  };

  const hasReview = (bookingId: string) => {
    return reviews.some(r => r.booking_id === bookingId);
  };

  const getReviewRating = (bookingId: string) => {
    const review = reviews.find(r => r.booking_id === bookingId);
    return review?.rating;
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case "pending_payment":
        return "Complete your UPI payment to proceed.";
      case "pending_confirmation":
        return "Payment submitted. Waiting for venue owner to verify.";
      case "confirmed":
        return "Your booking is confirmed. See you there!";
      case "cancelled":
        return "This booking has been cancelled.";
      default:
        return "";
    }
  };

  const upcomingBookings = bookings.filter(isUpcoming);
  const pastBookings = bookings.filter(isPast);

  const renderBookingCard = (booking: Booking, showReviewButton: boolean) => (
    <Card key={booking.id} className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="bg-muted/50 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
          <div className="flex-1">
            <CardTitle className="text-lg">{booking.venues.name}</CardTitle>
            <CardDescription className="flex items-center gap-1.5 mt-1">
              <MapPin className="h-3.5 w-3.5" />
              {booking.venues.location}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={booking.status} size="sm" />
            {showReviewButton && hasReview(booking.id) && (
              <div className="flex items-center gap-1 text-sm bg-warning/10 text-warning px-2 py-1 rounded-lg">
                <Star className="h-3.5 w-3.5 fill-warning" />
                <span className="font-semibold">{getReviewRating(booking.id)}</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {/* Status Message */}
        {getStatusMessage(booking.status) && (
          <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 text-sm ${
            booking.status === "confirmed" ? "bg-success/10 text-success" :
            booking.status === "pending_confirmation" ? "bg-primary/10 text-primary" :
            booking.status === "pending_payment" ? "bg-warning/10 text-warning" :
            "bg-muted text-muted-foreground"
          }`}>
            {booking.status === "confirmed" && <CheckCircle className="h-4 w-4" />}
            {booking.status === "pending_confirmation" && <Clock className="h-4 w-4" />}
            {booking.status === "pending_payment" && <Smartphone className="h-4 w-4" />}
            {getStatusMessage(booking.status)}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-semibold text-sm">{new Date(booking.booking_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Time</p>
              <p className="font-semibold text-sm">
                {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-sm">₹</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Amount</p>
              <p className="font-semibold text-sm">₹{booking.total_amount}</p>
            </div>
          </div>
        </div>

        {booking.notes && (
          <div className="bg-muted/50 rounded-lg p-3 mb-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Notes:</span> {booking.notes}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {/* Receipt Button - show for confirmed/completed bookings */}
          {(booking.status === "confirmed" || booking.payment_status === "completed") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReceiptDialog({ open: true, booking })}
              className="rounded-lg"
            >
              <Receipt className="h-4 w-4 mr-1" />
              Receipt
            </Button>
          )}

          {/* Review Button - show for past completed bookings without review */}
          {showReviewButton && !hasReview(booking.id) && booking.status === "confirmed" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReviewDialog({ open: true, booking })}
              className="rounded-lg"
            >
              <Star className="h-4 w-4 mr-1" />
              Leave Review
            </Button>
          )}

          {/* Cancel Button - only for pending or confirmed bookings */}
          {!showReviewButton && (booking.status === "confirmed" || booking.status === "pending_confirmation") && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => cancelBooking(booking.id)}
              className="rounded-lg"
            >
              Cancel Booking
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">My Bookings</h1>
          <p className="text-muted-foreground">View and manage your venue bookings</p>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <Card className="text-center py-16 border-dashed">
            <CardContent>
              <AlertCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Bookings Yet</h3>
              <p className="text-muted-foreground mb-6">Start by browsing venues and making your first booking.</p>
              <Button size="lg" onClick={() => navigate("/browse-venues")}>Browse Venues</Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-card border h-11 p-1 rounded-xl">
              <TabsTrigger value="upcoming" className="rounded-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Upcoming ({upcomingBookings.length})
              </TabsTrigger>
              <TabsTrigger value="past" className="rounded-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Past ({pastBookings.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-4">
              {upcomingBookings.length === 0 ? (
                <Card className="text-center py-12 border-dashed">
                  <CardContent>
                    <Calendar className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">No upcoming bookings</p>
                    <Button variant="outline" onClick={() => navigate("/browse-venues")} className="mt-4">
                      Book a Venue
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                upcomingBookings.map((booking) => renderBookingCard(booking, false))
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-4">
              {pastBookings.length === 0 ? (
                <Card className="text-center py-12 border-dashed">
                  <CardContent>
                    <Clock className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">No past bookings</p>
                  </CardContent>
                </Card>
              ) : (
                pastBookings.map((booking) => renderBookingCard(booking, true))
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
      <Footer />

      {/* Review Dialog */}
      {reviewDialog.booking && (
        <ReviewDialog
          open={reviewDialog.open}
          onOpenChange={(open) => setReviewDialog({ open, booking: open ? reviewDialog.booking : null })}
          bookingId={reviewDialog.booking.id}
          venueId={reviewDialog.booking.venues.id}
          venueName={reviewDialog.booking.venues.name}
          onSuccess={async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) fetchReviews(user.id);
          }}
        />
      )}

      {/* Receipt Dialog */}
      {receiptDialog.booking && (
        <PaymentReceipt
          open={receiptDialog.open}
          onOpenChange={(open) => setReceiptDialog({ open, booking: open ? receiptDialog.booking : null })}
          receipt={{
            bookingId: receiptDialog.booking.id,
            venueName: receiptDialog.booking.venues.name,
            venueLocation: receiptDialog.booking.venues.location,
            bookingDate: receiptDialog.booking.booking_date,
            startTime: receiptDialog.booking.start_time,
            endTime: receiptDialog.booking.end_time,
            totalAmount: receiptDialog.booking.total_amount,
            paymentStatus: receiptDialog.booking.payment_status,
            transactionId: receiptDialog.booking.payment_intent_id || undefined,
          }}
        />
      )}
    </div>
  );
};

export default MyBookings;