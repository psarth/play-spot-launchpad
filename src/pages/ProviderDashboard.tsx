import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, Clock, IndianRupee, Building2, Star } from "lucide-react";
import ManageVenues from "@/components/provider/ManageVenues";
import ManageBookings from "@/components/provider/ManageBookings";
import ManageTimeSlots from "@/components/provider/ManageTimeSlots";

interface DashboardStats {
  todayBookings: number;
  pendingBookings: number;
  totalEarnings: number;
  totalVenues: number;
  averageRating: number;
}

const ProviderDashboard = () => {
  const [isProvider, setIsProvider] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    todayBookings: 0,
    pendingBookings: 0,
    totalEarnings: 0,
    totalVenues: 0,
    averageRating: 0,
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkProviderAccess();
  }, []);

  const checkProviderAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/login");
      return;
    }

    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "provider")
      .single();

    if (error || !data) {
      toast({
        title: "Access Denied",
        description: "You need provider access to view this page",
        variant: "destructive",
      });
      navigate("/");
    } else {
      setIsProvider(true);
      fetchStats(user.id);
    }
    setLoading(false);
  };

  const fetchStats = async (userId: string) => {
    // Get venues for this provider
    const { data: venues } = await supabase
      .from("venues")
      .select("id, average_rating")
      .eq("provider_id", userId);

    const venueIds = venues?.map(v => v.id) || [];
    const totalVenues = venues?.length || 0;
    
    // Calculate average rating
    const ratings = venues?.filter(v => v.average_rating && v.average_rating > 0).map(v => v.average_rating) || [];
    const averageRating = ratings.length > 0 
      ? Math.round((ratings.reduce((a, b) => a! + b!, 0)! / ratings.length) * 10) / 10 
      : 0;

    if (venueIds.length === 0) {
      setStats({ todayBookings: 0, pendingBookings: 0, totalEarnings: 0, totalVenues: 0, averageRating: 0 });
      return;
    }

    // Get today's bookings
    const today = new Date().toISOString().split("T")[0];
    const { data: todayData } = await supabase
      .from("bookings")
      .select("id")
      .in("venue_id", venueIds)
      .eq("booking_date", today)
      .eq("status", "confirmed");

    // Get pending confirmation bookings
    const { data: pendingData } = await supabase
      .from("bookings")
      .select("id")
      .in("venue_id", venueIds)
      .eq("status", "pending_confirmation");

    // Get total earnings (confirmed bookings)
    const { data: earningsData } = await supabase
      .from("bookings")
      .select("total_amount")
      .in("venue_id", venueIds)
      .eq("status", "confirmed");

    const totalEarnings = earningsData?.reduce((sum, b) => sum + Number(b.total_amount), 0) || 0;

    setStats({
      todayBookings: todayData?.length || 0,
      pendingBookings: pendingData?.length || 0,
      totalEarnings,
      totalVenues,
      averageRating,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isProvider) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-secondary/30">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-8 sm:py-12 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Provider Dashboard</h1>
          <p className="text-muted-foreground">Manage your venues, bookings, and time slots</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="bg-card">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Today's Bookings</p>
                  <p className="text-2xl font-bold text-primary">{stats.todayBookings}</p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`bg-card ${stats.pendingBookings > 0 ? "border-warning" : ""}`}>
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Pending Verification</p>
                  <p className="text-2xl font-bold text-warning">{stats.pendingBookings}</p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-warning/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Earnings</p>
                  <p className="text-2xl font-bold text-green-600">₹{stats.totalEarnings.toLocaleString()}</p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <IndianRupee className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">My Venues</p>
                  <p className="text-2xl font-bold">{stats.totalVenues}</p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Avg Rating</p>
                  <p className="text-2xl font-bold text-yellow-500">
                    {stats.averageRating > 0 ? stats.averageRating : "—"}
                  </p>
                </div>
                <div className="h-11 w-11 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                  <Star className="h-5 w-5 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="bookings" className="space-y-6">
          <TabsList className="bg-card border h-11 p-1 rounded-xl w-full sm:w-auto">
            <TabsTrigger 
              value="bookings" 
              className="rounded-lg text-xs sm:text-sm px-3 sm:px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Bookings
            </TabsTrigger>
            <TabsTrigger 
              value="venues" 
              className="rounded-lg text-xs sm:text-sm px-3 sm:px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Venues
            </TabsTrigger>
            <TabsTrigger 
              value="timeslots" 
              className="rounded-lg text-xs sm:text-sm px-3 sm:px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Time Slots
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            <ManageBookings />
          </TabsContent>

          <TabsContent value="venues">
            <ManageVenues />
          </TabsContent>

          <TabsContent value="timeslots">
            <ManageTimeSlots />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default ProviderDashboard;
