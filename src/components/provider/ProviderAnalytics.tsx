import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from "recharts";
import { TrendingUp, Calendar, Clock, IndianRupee, Users, Star } from "lucide-react";

interface AnalyticsData {
  totalRevenue: number;
  monthlyRevenue: number;
  totalBookings: number;
  monthlyBookings: number;
  popularTimeSlots: { time: string; count: number }[];
  revenueByMonth: { month: string; revenue: number }[];
  bookingsByStatus: { name: string; value: number }[];
  sportDistribution: { name: string; value: number }[];
  averageRating: number;
  repeatCustomers: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#f59e0b', '#8b5cf6'];

const ProviderAnalytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalBookings: 0,
    monthlyBookings: 0,
    popularTimeSlots: [],
    revenueByMonth: [],
    bookingsByStatus: [],
    sportDistribution: [],
    averageRating: 0,
    repeatCustomers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get provider's venues
    const { data: venues } = await supabase
      .from("venues")
      .select("id, average_rating, sports:sport_id(name)")
      .eq("provider_id", user.id);

    if (!venues || venues.length === 0) {
      setLoading(false);
      return;
    }

    const venueIds = venues.map(v => v.id);

    // Get all bookings for provider's venues
    const { data: bookings } = await supabase
      .from("bookings")
      .select("*")
      .in("venue_id", venueIds);

    if (!bookings) {
      setLoading(false);
      return;
    }

    // Calculate total and monthly revenue
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
    const totalRevenue = confirmedBookings.reduce((sum, b) => sum + Number(b.total_amount), 0);
    const monthlyRevenue = confirmedBookings
      .filter(b => new Date(b.created_at) >= startOfMonth)
      .reduce((sum, b) => sum + Number(b.total_amount), 0);

    // Calculate monthly bookings
    const monthlyBookings = bookings.filter(b => new Date(b.created_at) >= startOfMonth).length;

    // Popular time slots
    const timeSlotCounts: Record<string, number> = {};
    bookings.forEach(b => {
      const hour = b.start_time?.split(':')[0] || '00';
      const timeLabel = `${hour}:00`;
      timeSlotCounts[timeLabel] = (timeSlotCounts[timeLabel] || 0) + 1;
    });
    const popularTimeSlots = Object.entries(timeSlotCounts)
      .map(([time, count]) => ({ time, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Revenue by month (last 6 months)
    const revenueByMonth: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = date.toLocaleString('default', { month: 'short' });
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthRevenue = confirmedBookings
        .filter(b => {
          const bookingDate = new Date(b.created_at);
          return bookingDate >= monthStart && bookingDate <= monthEnd;
        })
        .reduce((sum, b) => sum + Number(b.total_amount), 0);
      
      revenueByMonth.push({ month: monthName, revenue: monthRevenue });
    }

    // Bookings by status
    const statusCounts: Record<string, number> = {};
    bookings.forEach(b => {
      statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
    });
    const bookingsByStatus = Object.entries(statusCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));

    // Sport distribution
    const sportCounts: Record<string, number> = {};
    venues.forEach(v => {
      const sportName = v.sports ? (v.sports as any).name : 'Unknown';
      const venueBookings = bookings.filter(b => b.venue_id === v.id).length;
      sportCounts[sportName] = (sportCounts[sportName] || 0) + venueBookings;
    });
    const sportDistribution = Object.entries(sportCounts).map(([name, value]) => ({
      name,
      value,
    }));

    // Average rating across venues
    const ratings = venues.filter(v => v.average_rating && v.average_rating > 0).map(v => v.average_rating);
    const averageRating = ratings.length > 0 
      ? Math.round((ratings.reduce((a, b) => a! + b!, 0)! / ratings.length) * 10) / 10 
      : 0;

    // Repeat customers (customers with more than 1 booking)
    const customerBookings: Record<string, number> = {};
    bookings.forEach(b => {
      customerBookings[b.customer_id] = (customerBookings[b.customer_id] || 0) + 1;
    });
    const repeatCustomers = Object.values(customerBookings).filter(count => count > 1).length;

    setAnalytics({
      totalRevenue,
      monthlyRevenue,
      totalBookings: bookings.length,
      monthlyBookings,
      popularTimeSlots,
      revenueByMonth,
      bookingsByStatus,
      sportDistribution,
      averageRating,
      repeatCustomers,
    });
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const chartConfig = {
    revenue: { label: "Revenue", color: "hsl(var(--primary))" },
    count: { label: "Bookings", color: "hsl(var(--primary))" },
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-primary">₹{analytics.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <IndianRupee className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold text-green-600">₹{analytics.monthlyRevenue.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold text-blue-600">{analytics.totalBookings}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Rating</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {analytics.averageRating > 0 ? analytics.averageRating : "—"}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Bookings</p>
                <p className="text-xl font-bold">{analytics.monthlyBookings}</p>
              </div>
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Repeat Customers</p>
                <p className="text-xl font-bold">{analytics.repeatCustomers}</p>
              </div>
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue Trend</CardTitle>
            <CardDescription>Last 6 months revenue</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.revenueByMonth.some(m => m.revenue > 0) ? (
              <ChartContainer config={chartConfig} className="h-[250px]">
                <LineChart data={analytics.revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No revenue data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Popular Time Slots */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Popular Time Slots</CardTitle>
            <CardDescription>Most booked hours</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.popularTimeSlots.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px]">
                <BarChart data={analytics.popularTimeSlots}>
                  <XAxis dataKey="time" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No booking data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bookings by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Booking Status Distribution</CardTitle>
            <CardDescription>Breakdown by status</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.bookingsByStatus.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px]">
                <PieChart>
                  <Pie
                    data={analytics.bookingsByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {analytics.bookingsByStatus.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No booking data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sport Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bookings by Sport</CardTitle>
            <CardDescription>Most popular sports</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.sportDistribution.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[250px]">
                <BarChart data={analytics.sportDistribution} layout="vertical">
                  <XAxis type="number" className="text-xs" />
                  <YAxis type="category" dataKey="name" className="text-xs" width={80} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar 
                    dataKey="value" 
                    fill="hsl(var(--accent))" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No booking data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProviderAnalytics;
