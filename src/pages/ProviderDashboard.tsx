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
    <div className="min-h-screen flex flex-col bg-secondary/30">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Provider Dashboard</h1>
          <p className="text-muted-foreground text-lg">Manage your venues and bookings</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Today's Bookings</p>
                  <p className="text-3xl font-bold text-primary">0</p>
                </div>
                <div className="h-14 w-14 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Clock className="h-7 w-7 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Pending Requests</p>
                  <p className="text-3xl font-bold text-accent">0</p>
                </div>
                <div className="h-14 w-14 rounded-xl bg-accent/20 flex items-center justify-center">
                  <Clock className="h-7 w-7 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Earnings</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">₹0</p>
                </div>
                <div className="h-14 w-14 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">₹</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="bookings" className="space-y-6">
          <TabsList className="bg-card border h-12 p-1 rounded-xl">
            <TabsTrigger value="bookings" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Manage Bookings
            </TabsTrigger>
            <TabsTrigger value="venues" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
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
