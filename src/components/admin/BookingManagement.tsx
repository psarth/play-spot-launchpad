import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, XCircle, CheckCircle, Calendar } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

interface Booking {
  id: string;
  venue_name: string;
  customer_name: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_amount: number;
  status: string;
  payment_status: string;
  sport_name: string;
}

const BookingManagement = () => {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [searchQuery, statusFilter, bookings]);

  const fetchBookings = async () => {
    try {
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (!bookingsData) return;

      const venueIds = [...new Set(bookingsData.map(b => b.venue_id))];
      const { data: venues } = await supabase
        .from("venues")
        .select("id, name, sport_id")
        .in("id", venueIds);

      const sportIds = [...new Set(venues?.map(v => v.sport_id) || [])];
      const { data: sports } = await supabase
        .from("sports")
        .select("id, name")
        .in("id", sportIds);

      const customerIds = [...new Set(bookingsData.map(b => b.customer_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", customerIds);

      const venueMap = new Map(venues?.map(v => [v.id, v]) || []);
      const sportMap = new Map(sports?.map(s => [s.id, s.name]) || []);
      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      const enrichedBookings: Booking[] = bookingsData.map(b => {
        const venue = venueMap.get(b.venue_id);
        return {
          id: b.id,
          venue_name: venue?.name || "Unknown Venue",
          customer_name: profileMap.get(b.customer_id) || "Unknown Customer",
          booking_date: b.booking_date,
          start_time: b.start_time,
          end_time: b.end_time,
          total_amount: Number(b.total_amount),
          status: b.status,
          payment_status: b.payment_status,
          sport_name: sportMap.get(venue?.sport_id || "") || "Unknown Sport",
        };
      });

      setBookings(enrichedBookings);
      setFilteredBookings(enrichedBookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterBookings = () => {
    let filtered = [...bookings];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        b =>
          b.venue_name.toLowerCase().includes(query) ||
          b.customer_name.toLowerCase().includes(query) ||
          b.sport_name.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(b => b.status === statusFilter);
    }

    setFilteredBookings(filtered);
  };

  const confirmBooking = async (bookingId: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "confirmed", payment_status: "completed" })
      .eq("id", bookingId);

    if (error) {
      toast({ title: "Error confirming booking", variant: "destructive" });
    } else {
      await supabase.from("payments").update({ status: "completed" }).eq("booking_id", bookingId);
      toast({ title: "Booking confirmed successfully" });
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

  const pendingCount = bookings.filter(b => b.status === "pending_confirmation").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Booking Management
            </CardTitle>
            {pendingCount > 0 && (
              <span className="text-sm bg-warning/10 text-warning px-3 py-1 rounded-full font-medium">
                {pendingCount} pending verification
              </span>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by venue, customer, or sport..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending_confirmation">⏳ Pending Confirmation</SelectItem>
                <SelectItem value="confirmed">✅ Confirmed</SelectItem>
                <SelectItem value="cancelled">❌ Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredBookings.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No bookings found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Venue</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <TableRow key={booking.id} className={booking.status === "pending_confirmation" ? "bg-warning/5" : ""}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{booking.venue_name}</p>
                        <p className="text-xs text-muted-foreground">{booking.sport_name}</p>
                      </div>
                    </TableCell>
                    <TableCell>{booking.customer_name}</TableCell>
                    <TableCell>{new Date(booking.booking_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</TableCell>
                    <TableCell>{booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}</TableCell>
                    <TableCell className="font-semibold">₹{booking.total_amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <StatusBadge status={booking.status} size="sm" />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {booking.status === "pending_confirmation" && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => confirmBooking(booking.id)}
                              className="gap-1"
                            >
                              <CheckCircle className="h-3 w-3" />
                              Verify
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => cancelBooking(booking.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        {booking.status !== "cancelled" && booking.status !== "pending_confirmation" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to cancel this booking? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                                <AlertDialogAction onClick={() => cancelBooking(booking.id)}>
                                  Cancel Booking
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BookingManagement;