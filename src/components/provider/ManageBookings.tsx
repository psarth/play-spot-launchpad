import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin, User, Phone, CheckCircle, XCircle, AlertCircle, Smartphone, IndianRupee, Table2, Dumbbell } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

interface Booking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_amount: number;
  status: string;
  payment_status: string;
  notes: string | null;
  table_court_id: string | null;
  venues: {
    name: string;
    location: string;
  } | null;
  profiles: {
    full_name: string;
    phone: string | null;
  } | null;
  table_court_name?: string;
  sport_name?: string;
}

const ManageBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [statusFilter, bookings]);

  const fetchBookings = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const { data: venuesData } = await supabase
      .from("venues")
      .select("id")
      .eq("provider_id", user.id);

    if (!venuesData || venuesData.length === 0) {
      setLoading(false);
      return;
    }

    const venueIds = venuesData.map((v) => v.id);

    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        venues!venue_id (name, location),
        profiles!customer_id (full_name, phone)
      `)
      .in("venue_id", venueIds)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error fetching bookings", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Fetch table/court info for each booking
    const bookingsWithDetails = await Promise.all(
      (data || []).map(async (booking) => {
        if (!booking.table_court_id) {
          return booking;
        }

        const { data: tcData } = await supabase
          .from("tables_courts")
          .select(`
            name,
            venue_sports:venue_sport_id (
              sports:sport_id (name)
            )
          `)
          .eq("id", booking.table_court_id)
          .maybeSingle();

        return {
          ...booking,
          table_court_name: tcData?.name,
          sport_name: (tcData?.venue_sports as any)?.sports?.name,
        };
      })
    );

    setBookings(bookingsWithDetails);
    setFilteredBookings(bookingsWithDetails);
    setLoading(false);
  };

  const filterBookings = () => {
    if (statusFilter === "all") {
      setFilteredBookings(bookings);
    } else {
      setFilteredBookings(bookings.filter((b) => b.status === statusFilter));
    }
  };

  const confirmBooking = async (bookingId: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ 
        status: "confirmed",
        payment_status: "paid" 
      })
      .eq("id", bookingId);

    if (error) {
      toast({ title: "Error confirming booking", variant: "destructive" });
    } else {
      // Update payment record
      await supabase
        .from("payments")
        .update({ status: "completed" })
        .eq("booking_id", bookingId);
        
      toast({ title: "Booking confirmed! Payment verified.", description: "Customer will be notified." });
      fetchBookings();
    }
  };

  const cancelBooking = async (bookingId: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);

    if (error) {
      toast({ title: "Error cancelling booking", variant: "destructive" });
    } else {
      toast({ title: "Booking cancelled" });
      fetchBookings();
    }
  };

  const pendingCount = bookings.filter(b => b.status === "pending").length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold">Manage Bookings</h2>
          {pendingCount > 0 && (
            <p className="text-warning text-sm mt-1 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {pendingCount} booking(s) awaiting payment verification
            </p>
          )}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Bookings</SelectItem>
            <SelectItem value="pending">⏳ Pending Verification</SelectItem>
            <SelectItem value="confirmed">✅ Confirmed</SelectItem>
            <SelectItem value="cancelled">❌ Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading bookings...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Bookings Found</h3>
            <p className="text-muted-foreground">Bookings will appear here when customers book your venues.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <Card key={booking.id} className={`overflow-hidden ${booking.status === "pending" ? "border-warning/50 bg-warning/5" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                  <div>
                    <CardTitle className="text-lg">{booking.venues?.name || 'Unknown Venue'}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <MapPin className="h-4 w-4" />
                      {booking.venues?.location || 'Unknown Location'}
                    </CardDescription>
                  </div>
                  <StatusBadge status={booking.status} />
                </div>
              </CardHeader>
              <CardContent>
                {/* Sport & Table/Court Info */}
                {(booking.sport_name || booking.table_court_name) && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {booking.sport_name && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Dumbbell className="h-3 w-3" />
                        {booking.sport_name}
                      </Badge>
                    )}
                    {booking.table_court_name && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Table2 className="h-3 w-3" />
                        {booking.table_court_name}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Customer</p>
                      <p className="font-semibold text-sm">{booking.profiles?.full_name || 'Unknown Customer'}</p>
                    </div>
                  </div>
                  
                  {booking.profiles?.phone && (
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Phone className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="font-semibold text-sm">{booking.profiles.phone}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="font-semibold text-sm">{new Date(booking.booking_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Time</p>
                      <p className="font-semibold text-sm">{booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg mb-4">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 text-muted-foreground" />
                    <span className="font-bold text-lg">₹{booking.total_amount}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Smartphone className="h-4 w-4" />
                    <span className="text-muted-foreground">UPI Payment</span>
                  </div>
                </div>

                {booking.notes && (
                  <div className="bg-muted/30 rounded-lg p-3 mb-4">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">Notes:</span> {booking.notes}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                {booking.status === "pending" && (
                  <div className="flex flex-col sm:flex-row gap-3 p-4 bg-warning/10 rounded-lg border border-warning/30">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-warning mb-1">⚠️ Payment Verification Required</p>
                      <p className="text-xs text-muted-foreground">
                        Customer claims to have paid ₹{booking.total_amount} via UPI. Please verify the payment in your UPI app before confirming.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => confirmBooking(booking.id)}
                        className="gap-1"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Verify & Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => cancelBooking(booking.id)}
                        className="text-destructive hover:text-destructive gap-1"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                )}

                {booking.status === "confirmed" && (
                  <div className="flex items-center gap-2 p-3 bg-success/10 rounded-lg text-success text-sm">
                    <CheckCircle className="h-4 w-4" />
                    Booking confirmed and payment verified
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManageBookings;