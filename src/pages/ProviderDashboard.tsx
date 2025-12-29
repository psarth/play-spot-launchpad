import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Clock } from "lucide-react";
import ManageVenues from "@/components/provider/ManageVenues";
import ManageBookings from "@/components/provider/ManageBookings";

const ProviderDashboard = () => {
  const [isProvider, setIsProvider] = useState(false);
  const [loading, setLoading] = useState(true);
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
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isProvider) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-8 sm:py-12 pt-24">
        <div className="mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 sm:mb-3">Provider Dashboard</h1>
          <p className="text-muted-foreground text-base sm:text-lg">Manage your venues and bookings</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="bg-card border-border">
            <CardContent className="pt-5 sm:pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Today's Bookings</p>
                  <p className="text-2xl sm:text-3xl font-bold text-primary">0</p>
                </div>
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-5 sm:pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Pending Requests</p>
                  <p className="text-2xl sm:text-3xl font-bold text-primary">0</p>
                </div>
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="pt-5 sm:pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Earnings</p>
                  <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">₹0</p>
                </div>
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <span className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">₹</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="bookings" className="space-y-4 sm:space-y-6">
          <TabsList className="bg-card border h-10 sm:h-12 p-1 rounded-xl w-full sm:w-auto">
            <TabsTrigger value="bookings" className="rounded-lg text-xs sm:text-sm px-3 sm:px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Manage Bookings
            </TabsTrigger>
            <TabsTrigger value="venues" className="rounded-lg text-xs sm:text-sm px-3 sm:px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              My Venues
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            <ManageBookings />
          </TabsContent>

          <TabsContent value="venues">
            <ManageVenues />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default ProviderDashboard;
