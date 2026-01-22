import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IndianRupee, TrendingUp, Percent, Calendar, Search, Download, Building2 } from "lucide-react";

interface Payout {
  id: string;
  booking_id: string;
  gross_amount: number;
  commission_amount: number;
  commission_percentage: number;
  net_amount: number;
  status: string;
  payout_date: string | null;
  created_at: string;
  venue_name?: string;
  booking_date?: string;
}

interface PayoutStats {
  totalGross: number;
  totalCommission: number;
  totalNet: number;
  pendingPayouts: number;
  completedPayouts: number;
}

const ProviderPayouts = () => {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [filteredPayouts, setFilteredPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState<PayoutStats>({
    totalGross: 0,
    totalCommission: 0,
    totalNet: 0,
    pendingPayouts: 0,
    completedPayouts: 0,
  });

  useEffect(() => {
    fetchPayouts();
  }, []);

  useEffect(() => {
    filterPayouts();
  }, [payouts, searchQuery]);

  const fetchPayouts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);

    const { data: payoutsData, error } = await supabase
      .from("payouts")
      .select("*")
      .eq("provider_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching payouts:", error);
      setLoading(false);
      return;
    }

    if (!payoutsData || payoutsData.length === 0) {
      setPayouts([]);
      setLoading(false);
      return;
    }

    // Fetch booking details for each payout
    const bookingIds = payoutsData.map((p) => p.booking_id);
    const { data: bookingsData } = await supabase
      .from("bookings")
      .select("id, booking_date, venue_id")
      .in("id", bookingIds);

    const venueIds = [...new Set(bookingsData?.map((b) => b.venue_id) || [])];
    const { data: venuesData } = await supabase
      .from("venues")
      .select("id, name")
      .in("id", venueIds);

    const venueMap = new Map(venuesData?.map((v) => [v.id, v.name]) || []);
    const bookingMap = new Map(
      bookingsData?.map((b) => [b.id, { booking_date: b.booking_date, venue_id: b.venue_id }]) || []
    );

    const enrichedPayouts = payoutsData.map((payout) => {
      const booking = bookingMap.get(payout.booking_id);
      return {
        ...payout,
        venue_name: booking ? venueMap.get(booking.venue_id) : "Unknown",
        booking_date: booking?.booking_date,
      };
    });

    setPayouts(enrichedPayouts);

    // Calculate stats
    const calcStats: PayoutStats = {
      totalGross: enrichedPayouts.reduce((sum, p) => sum + Number(p.gross_amount), 0),
      totalCommission: enrichedPayouts.reduce((sum, p) => sum + Number(p.commission_amount), 0),
      totalNet: enrichedPayouts.reduce((sum, p) => sum + Number(p.net_amount), 0),
      pendingPayouts: enrichedPayouts.filter((p) => p.status === "pending").length,
      completedPayouts: enrichedPayouts.filter((p) => p.status === "completed").length,
    };
    setStats(calcStats);

    setLoading(false);
  };

  const filterPayouts = () => {
    if (!searchQuery) {
      setFilteredPayouts(payouts);
      return;
    }

    const query = searchQuery.toLowerCase();
    setFilteredPayouts(
      payouts.filter(
        (p) =>
          p.venue_name?.toLowerCase().includes(query) ||
          p.booking_date?.includes(query) ||
          p.status.toLowerCase().includes(query)
      )
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Completed</Badge>;
      case "processing":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">Processing</Badge>;
      case "pending":
        return <Badge className="bg-warning/10 text-warning border-warning/30">Pending</Badge>;
      case "failed":
        return <Badge className="bg-destructive/10 text-destructive border-destructive/30">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold text-green-600">₹{stats.totalGross.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <IndianRupee className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Platform Commission</p>
                <p className="text-2xl font-bold text-warning">₹{stats.totalCommission.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Percent className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Received</p>
                <p className="text-2xl font-bold text-primary">₹{stats.totalNet.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Payouts</p>
                <p className="text-2xl font-bold">{payouts.length}</p>
                <p className="text-xs text-muted-foreground">
                  {stats.pendingPayouts} pending · {stats.completedPayouts} completed
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payouts Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Payout History</CardTitle>
              <CardDescription>Track your earnings and commission breakdown</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search payouts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPayouts.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No payouts yet</p>
              <p className="text-sm text-muted-foreground">
                Payouts will appear here when your bookings are confirmed
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Venue</TableHead>
                    <TableHead>Booking Date</TableHead>
                    <TableHead className="text-right">Gross Amount</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Net Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell className="font-medium">{payout.venue_name}</TableCell>
                      <TableCell>
                        {payout.booking_date
                          ? new Date(payout.booking_date).toLocaleDateString("en-IN")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">₹{Number(payout.gross_amount).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-warning">
                        -₹{Number(payout.commission_amount).toLocaleString()}
                        <span className="text-xs text-muted-foreground ml-1">
                          ({payout.commission_percentage}%)
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        ₹{Number(payout.net_amount).toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(payout.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(payout.created_at).toLocaleDateString("en-IN")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProviderPayouts;
