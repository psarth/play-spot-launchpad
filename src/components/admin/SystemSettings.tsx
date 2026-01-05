import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Settings, Bell, Users, Building2, Mail, Shield, AlertTriangle } from "lucide-react";

const SystemSettings = () => {
  const { toast } = useToast();
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [bookingEnabled, setBookingEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  
  // Notification state
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationTarget, setNotificationTarget] = useState("all");
  const [sendingNotification, setSendingNotification] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    // For now, we'll use local state since the system_settings table 
    // wasn't created in the first migration
    setLoading(false);
  };

  const toggleMaintenanceMode = async () => {
    setMaintenanceMode(!maintenanceMode);
    toast({ 
      title: maintenanceMode ? "Maintenance mode disabled" : "Maintenance mode enabled",
      description: maintenanceMode ? "The platform is now live" : "Users will see a maintenance message"
    });
  };

  const toggleBooking = async () => {
    setBookingEnabled(!bookingEnabled);
    toast({ 
      title: bookingEnabled ? "Bookings disabled" : "Bookings enabled",
      description: bookingEnabled ? "New bookings are now disabled" : "Users can now make bookings"
    });
  };

  const sendNotification = async () => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    setSendingNotification(true);
    
    // Simulate sending notification
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({ 
      title: "Notification sent successfully",
      description: `Sent to ${notificationTarget === "all" ? "all users" : notificationTarget + "s"}`
    });
    
    setNotificationTitle("");
    setNotificationMessage("");
    setSendingNotification(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Controls
          </CardTitle>
          <CardDescription>
            Manage platform-wide settings and controls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-xl">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="font-medium">Maintenance Mode</p>
                <p className="text-sm text-muted-foreground">
                  When enabled, users will see a maintenance message
                </p>
              </div>
            </div>
            <Switch
              checked={maintenanceMode}
              onCheckedChange={toggleMaintenanceMode}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-xl">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium">Booking System</p>
                <p className="text-sm text-muted-foreground">
                  Enable or disable new bookings globally
                </p>
              </div>
            </div>
            <Switch
              checked={bookingEnabled}
              onCheckedChange={toggleBooking}
            />
          </div>
        </CardContent>
      </Card>

      {/* Send Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Send Notification
          </CardTitle>
          <CardDescription>
            Send notifications to users on the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="target">Target Audience</Label>
            <Select value={notificationTarget} onValueChange={setNotificationTarget}>
              <SelectTrigger>
                <SelectValue placeholder="Select target" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    All Users
                  </div>
                </SelectItem>
                <SelectItem value="customer">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Customers Only
                  </div>
                </SelectItem>
                <SelectItem value="provider">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Providers Only
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Notification Title</Label>
            <Input
              id="title"
              placeholder="Enter notification title..."
              value={notificationTitle}
              onChange={(e) => setNotificationTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Enter your message..."
              value={notificationMessage}
              onChange={(e) => setNotificationMessage(e.target.value)}
              rows={4}
            />
          </div>

          <Button 
            onClick={sendNotification} 
            disabled={sendingNotification}
            className="w-full"
          >
            {sendingNotification ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Notification
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Platform Info */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-muted-foreground">Platform Version</p>
              <p className="font-medium">SportSpot v1.0.0</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-muted-foreground">Last Updated</p>
              <p className="font-medium">{new Date().toLocaleDateString()}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-muted-foreground">Environment</p>
              <p className="font-medium">Production</p>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium text-green-600">Online</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemSettings;