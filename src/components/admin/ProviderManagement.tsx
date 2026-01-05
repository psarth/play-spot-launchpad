import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Search, UserX, UserCheck, Trash2, CheckCircle, XCircle } from "lucide-react";

interface Provider {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  is_suspended: boolean;
  is_approved: boolean;
  created_at: string;
  venues_count: number;
  total_earnings: number;
}

const ProviderManagement = () => {
  const { toast } = useToast();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<Provider[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProviders();
  }, []);

  useEffect(() => {
    filterProviders();
  }, [searchQuery, providers]);

  const fetchProviders = async () => {
    try {
      // Get all providers
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "provider");

      if (!roles) return;

      const providerIds = roles.map(r => r.user_id);

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", providerIds);

      // Get venues count and earnings per provider
      const { data: venues } = await supabase
        .from("venues")
        .select("provider_id, id");

      const { data: bookings } = await supabase
        .from("bookings")
        .select("venue_id, total_amount");

      const venueCounts: Record<string, number> = {};
      const venueToProvider: Record<string, string> = {};
      venues?.forEach(v => {
        venueCounts[v.provider_id] = (venueCounts[v.provider_id] || 0) + 1;
        venueToProvider[v.id] = v.provider_id;
      });

      const earnings: Record<string, number> = {};
      bookings?.forEach(b => {
        const providerId = venueToProvider[b.venue_id];
        if (providerId) {
          earnings[providerId] = (earnings[providerId] || 0) + Number(b.total_amount);
        }
      });

      const providerData: Provider[] = (profiles || []).map(p => ({
        id: p.id,
        email: `provider_${p.id.slice(0, 8)}@sportspot.com`,
        full_name: p.full_name || "Unknown",
        phone: p.phone,
        is_suspended: p.is_suspended || false,
        is_approved: p.is_approved ?? true,
        created_at: p.created_at,
        venues_count: venueCounts[p.id] || 0,
        total_earnings: earnings[p.id] || 0,
      }));

      setProviders(providerData);
      setFilteredProviders(providerData);
    } catch (error) {
      console.error("Error fetching providers:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterProviders = () => {
    if (!searchQuery) {
      setFilteredProviders(providers);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = providers.filter(
      p =>
        p.full_name.toLowerCase().includes(query) ||
        p.email.toLowerCase().includes(query) ||
        p.phone?.toLowerCase().includes(query)
    );
    setFilteredProviders(filtered);
  };

  const toggleSuspension = async (providerId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_suspended: !currentStatus })
      .eq("id", providerId);

    if (error) {
      toast({ title: "Error updating provider", variant: "destructive" });
    } else {
      toast({ title: currentStatus ? "Provider unblocked" : "Provider blocked" });
      fetchProviders();
    }
  };

  const toggleApproval = async (providerId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_approved: !currentStatus })
      .eq("id", providerId);

    if (error) {
      toast({ title: "Error updating provider", variant: "destructive" });
    } else {
      toast({ title: currentStatus ? "Provider rejected" : "Provider approved" });
      fetchProviders();
    }
  };

  const deleteProvider = async (providerId: string) => {
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", providerId);

    if (error) {
      toast({ title: "Error deleting provider", variant: "destructive" });
    } else {
      toast({ title: "Provider deleted successfully" });
      fetchProviders();
    }
  };

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>Provider Management</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search providers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredProviders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No providers found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Venues</TableHead>
                  <TableHead>Earnings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProviders.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{provider.full_name}</p>
                        <p className="text-sm text-muted-foreground">{provider.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{provider.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{provider.venues_count}</Badge>
                    </TableCell>
                    <TableCell>₹{provider.total_earnings.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={provider.is_suspended ? "destructive" : "default"}>
                        {provider.is_suspended ? "Suspended" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={provider.is_approved ? "default" : "outline"}>
                        {provider.is_approved ? "Approved" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleApproval(provider.id, provider.is_approved)}
                          title={provider.is_approved ? "Reject" : "Approve"}
                        >
                          {provider.is_approved ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleSuspension(provider.id, provider.is_suspended)}
                        >
                          {provider.is_suspended ? (
                            <UserCheck className="h-4 w-4" />
                          ) : (
                            <UserX className="h-4 w-4" />
                          )}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Provider</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this provider? This will also remove all their venues.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteProvider(provider.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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

export default ProviderManagement;