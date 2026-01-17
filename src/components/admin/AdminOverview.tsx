import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  Building2, 
  CalendarDays, 
  IndianRupee,
  AlertCircle,
  UserCheck,
  Calendar,
  CheckCircle
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
  pendingVerification: number;
  confirmedBookings: number;
}

interface BookingsByStatus {
  name: string;
  value: number;
}

const statusLabels: Record<string, string> = {
  pending: "Pending Verification",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  completed: "Completed",
};

const AdminOverview = () => {
  const [stats, setStats] = useState<Stats>({
    totalCustomers: 0,
    totalProviders: 0,
    totalBookings: 0,
    totalRevenue: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    todayBookings: 0,
    pendingVerification: 0,
    confirmedBookings: 0,
  });
  const [bookingsByStatus, setBookingsByStatus] = useState<BookingsByStatus[]>([]);
  const [revenueByMonth, setRevenueByMonth] = useState<{ month: string; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: roles } = await supabase.from("user_roles").select("role");
      const customers = roles?.filter(r => r.role === "customer").length || 0;
      const providers = roles?.filter(r => r.role === "provider").length || 0;

      const { data: profiles } = await supabase.from("profiles").select("is_suspended");
      const active = profiles?.filter(p => !p.is_suspended).length || 0;
      const suspended = profiles?.filter(p => p.is_suspended).length || 0;

      const { data: bookings } = await supabase.from("bookings").select("*");
      const totalBookings = bookings?.length || 0;
      const totalRevenue = bookings?.filter(b => b.status === "confirmed").reduce((sum, b) => sum + Number(b.total_amount), 0) || 0;

      const today = new Date().toISOString().split("T")[0];
      const todayBookings = bookings?.filter(b => b.booking_date === today).length || 0;
      const pendingVerification = bookings?.filter(b => b.status === "pending").length || 0;
      const confirmedBookings = bookings?.filter(b => b.status === "confirmed").length || 0;

      const statusCounts: Record<string, number> = {};
      bookings?.forEach(b => {
        const label = statusLabels[b.status] || b.status;
        statusCounts[label] = (statusCounts[label] || 0) + 1;
      });
      const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

      const monthlyRevenue: Record<string, number> = {};
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      bookings?.filter(b => b.status === "confirmed").forEach(b => {
        const date = new Date(b.created_at);
        const monthKey = `${months[date.getMonth()]}`;
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
        pendingVerification,
        confirmedBookings,
      });
      setBookingsByStatus(statusData);
      setRevenueByMonth(revenueData);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ["hsl(24, 95%, 53%)", "hsl(145, 70%, 45%)", "hsl(0, 84%, 60%)", "hsl(220, 70%, 50%)"];

  const statCards = [
    { title: "Total Customers", value: stats.totalCustomers, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Total Providers", value: stats.totalProviders, icon: Building2, color: "text-purple-500", bg: "bg-purple-500/10" },
    { title: "Total Bookings", value: stats.totalBookings, icon: CalendarDays, color: "text-primary", bg: "bg-primary/10" },
    { title: "Confirmed Revenue", value: `₹${stats.totalRevenue.toLocaleString()}`, icon: IndianRupee, color: "text-success", bg: "bg-success/10" },
    { title: "Confirmed Bookings", value: stats.confirmedBookings, icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
    { title: "Pending Verification", value: stats.pendingVerification, icon: AlertCircle, color: "text-warning", bg: "bg-warning/10" },
    { title: "Today's Bookings", value: stats.todayBookings, icon: Calendar, color: "text-cyan-500", bg: "bg-cyan-500/10" },
    { title: "Active Users", value: stats.activeUsers, icon: UserCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
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
      {/* Alert for pending verification */}
      {stats.pendingVerification > 0 && (
        <div className="p-4 bg-warning/10 border border-warning/30 rounded-xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-warning" />
          <div>
            <p className="font-semibold text-warning">Action Required</p>
            <p className="text-sm text-muted-foreground">
              {stats.pendingVerification} booking(s) are waiting for payment verification. Go to Bookings tab to verify.
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`h-11 w-11 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Confirmed Revenue</CardTitle>
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
                  <Bar dataKey="revenue" fill="hsl(24, 95%, 53%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No revenue data yet
              </div>
            )}
          </CardContent>
        </Card>

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
                No booking data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminOverview;