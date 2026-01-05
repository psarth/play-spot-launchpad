import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  Building2, 
  CalendarDays, 
  IndianRupee,
  TrendingUp,
  UserCheck,
  UserX,
  Calendar
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface Stats {
  totalCustomers: number;
  totalProviders: number;
  totalBookings: number;
  totalRevenue: number;
  activeUsers: number;
  suspendedUsers: number;
  todayBookings: number;
  pendingBookings: number;
}

interface BookingsByStatus {
  name: string;
  value: number;
}

const AdminOverview = () => {
  const [stats, setStats] = useState<Stats>({
    totalCustomers: 0,
    totalProviders: 0,
    totalBookings: 0,
    totalRevenue: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    todayBookings: 0,
    pendingBookings: 0,
  });
  const [bookingsByStatus, setBookingsByStatus] = useState<BookingsByStatus[]>([]);
  const [revenueByMonth, setRevenueByMonth] = useState<{ month: string; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch user counts by role
      const { data: roles } = await supabase.from("user_roles").select("role");
      const customers = roles?.filter(r => r.role === "customer").length || 0;
      const providers = roles?.filter(r => r.role === "provider").length || 0;

      // Fetch profiles for active/suspended counts
      const { data: profiles } = await supabase.from("profiles").select("is_suspended");
      const active = profiles?.filter(p => !p.is_suspended).length || 0;
      const suspended = profiles?.filter(p => p.is_suspended).length || 0;

      // Fetch bookings
      const { data: bookings } = await supabase.from("bookings").select("*");
      const totalBookings = bookings?.length || 0;
      const totalRevenue = bookings?.reduce((sum, b) => sum + Number(b.total_amount), 0) || 0;

      // Today's bookings
      const today = new Date().toISOString().split("T")[0];
      const todayBookings = bookings?.filter(b => b.booking_date === today).length || 0;
      const pendingBookings = bookings?.filter(b => b.status === "pending").length || 0;

      // Bookings by status for pie chart
      const statusCounts: Record<string, number> = {};
      bookings?.forEach(b => {
        statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
      });
      const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

      // Revenue by month (last 6 months)
      const monthlyRevenue: Record<string, number> = {};
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      bookings?.forEach(b => {
        const date = new Date(b.created_at);
        const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`;
        monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + Number(b.total_amount);
      });
      const revenueData = Object.entries(monthlyRevenue)
        .slice(-6)
        .map(([month, revenue]) => ({ month, revenue }));

      setStats({
        totalCustomers: customers,
        totalProviders: providers,
        totalBookings,
        totalRevenue,
        activeUsers: active,
        suspendedUsers: suspended,
        todayBookings,
        pendingBookings,
      });
      setBookingsByStatus(statusData);
      setRevenueByMonth(revenueData);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--muted))", "hsl(var(--destructive))"];

  const statCards = [
    { title: "Total Customers", value: stats.totalCustomers, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Total Providers", value: stats.totalProviders, icon: Building2, color: "text-purple-500", bg: "bg-purple-500/10" },
    { title: "Total Bookings", value: stats.totalBookings, icon: CalendarDays, color: "text-green-500", bg: "bg-green-500/10" },
    { title: "Total Revenue", value: `₹${stats.totalRevenue.toLocaleString()}`, icon: IndianRupee, color: "text-amber-500", bg: "bg-amber-500/10" },
    { title: "Active Users", value: stats.activeUsers, icon: UserCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { title: "Suspended Users", value: stats.suspendedUsers, icon: UserX, color: "text-red-500", bg: "bg-red-500/10" },
    { title: "Today's Bookings", value: stats.todayBookings, icon: Calendar, color: "text-cyan-500", bg: "bg-cyan-500/10" },
    { title: "Pending Bookings", value: stats.pendingBookings, icon: TrendingUp, color: "text-orange-500", bg: "bg-orange-500/10" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`h-12 w-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                    formatter={(value: number) => [`₹${value.toLocaleString()}`, "Revenue"]}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No revenue data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bookings Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bookings by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {bookingsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={bookingsByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {bookingsByStatus.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No booking data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminOverview;