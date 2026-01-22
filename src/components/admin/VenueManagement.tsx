import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Search, CheckCircle, XCircle, MapPin, Shield, Clock } from "lucide-react";

interface Venue {
  id: string;
  name: string;
  location: string;
  price_per_hour: number;
  verification_status: string | null;
  is_verified: boolean | null;
  is_active: boolean | null;
  created_at: string;
  provider_name: string;
  sport_name: string;
}

const VenueManagement = () => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchVenues();
  }, []);

  useEffect(() => {
    filterVenues();
  }, [searchQuery, venues]);

  const fetchVenues = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("venues")
      .select(`*, sports:sport_id (name), profiles:provider_id (full_name)`)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error fetching venues", variant: "destructive" });
    } else {
      const formattedVenues = data?.map(v => ({
        id: v.id,
        name: v.name,
        location: v.location,
        price_per_hour: v.price_per_hour,
        verification_status: v.verification_status || 'pending',
        is_verified: v.is_verified,
        is_active: v.is_active,
        created_at: v.created_at,
        provider_name: v.profiles ? (v.profiles as any).full_name || 'Unknown' : 'Unknown',
        sport_name: v.sports ? (v.sports as any).name || 'Unknown' : 'Unknown',
      })) || [];
      setVenues(formattedVenues);
      setFilteredVenues(formattedVenues);
    }
    setLoading(false);
  };

  const filterVenues = () => {
    if (!searchQuery) {
      setFilteredVenues(venues);
      return;
    }
    const query = searchQuery.toLowerCase();
    setFilteredVenues(venues.filter(v => 
      v.name.toLowerCase().includes(query) || 
      v.location.toLowerCase().includes(query) ||
      v.provider_name.toLowerCase().includes(query)
    ));
  };

  const updateVerificationStatus = async (venueId: string, status: 'verified' | 'rejected') => {
    const { error } = await supabase
      .from("venues")
      .update({ 
        verification_status: status, 
        is_verified: status === 'verified',
        is_active: status === 'verified'
      })
      .eq("id", venueId);

    if (error) {
      toast({ title: "Error updating venue", variant: "destructive" });
    } else {
      toast({ title: status === 'verified' ? "Venue verified!" : "Venue rejected" });
      fetchVenues();
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'verified':
        return <Badge className="verified-badge gap-1"><Shield className="h-3 w-3" />Verified</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
      </div>
    );
  }

  const pendingCount = venues.filter(v => v.verification_status === 'pending' || !v.verification_status).length;

  return (
    <div className="space-y-6">
      {pendingCount > 0 && (
        <div className="p-4 bg-warning/10 border border-warning/30 rounded-xl flex items-center gap-3">
          <Clock className="h-5 w-5 text-warning" />
          <p className="text-sm"><strong>{pendingCount} venue(s)</strong> pending verification</p>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Venue Verification</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search venues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Venue</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Sport</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVenues.map((venue) => (
                <TableRow key={venue.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{venue.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />{venue.location}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{venue.provider_name}</TableCell>
                  <TableCell>{venue.sport_name}</TableCell>
                  <TableCell>₹{venue.price_per_hour}/hr</TableCell>
                  <TableCell>{getStatusBadge(venue.verification_status)}</TableCell>
                  <TableCell className="text-right">
                    {venue.verification_status !== 'verified' && (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateVerificationStatus(venue.id, 'verified')}
                          className="gap-1"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Verify
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateVerificationStatus(venue.id, 'rejected')}
                          className="gap-1 text-destructive hover:text-destructive"
                        >
                          <XCircle className="h-3 w-3" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default VenueManagement;
