import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Settings, CreditCard, Dumbbell, AlertTriangle } from "lucide-react";
import AddVenueDialog from "./AddVenueDialog";
import VenueConfigDialog from "./VenueConfigDialog";

interface Venue {
  id: string;
  name: string;
  location: string;
  price_per_hour: number;
  is_active: boolean;
  description: string | null;
  sports: { name: string } | null;
  has_payment_details: boolean;
  sports_count: number;
}

const ManageVenues = () => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<{ id: string; name: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    // Fetch venues with their sports
    const { data: venuesData, error } = await supabase
      .from("venues")
      .select(`
        *,
        sports:sport_id (name)
      `)
      .eq("provider_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error fetching venues", variant: "destructive" });
      setLoading(false);
      return;
    }

    // For each venue, check if it has payment details and count sports
    const venuesWithDetails = await Promise.all(
      (venuesData || []).map(async (venue) => {
        // Check payment details
        const { data: paymentData } = await supabase
          .from("venue_payment_details")
          .select("id")
          .eq("venue_id", venue.id)
          .maybeSingle();

        // Count venue sports
        const { count: sportsCount } = await supabase
          .from("venue_sports")
          .select("*", { count: "exact", head: true })
          .eq("venue_id", venue.id);

        return {
          ...venue,
          has_payment_details: !!paymentData,
          sports_count: sportsCount || 0,
        };
      })
    );

    setVenues(venuesWithDetails);
    setLoading(false);
  };

  const deleteVenue = async (venueId: string) => {
    if (!confirm("Are you sure you want to delete this venue?")) return;

    const { error } = await supabase
      .from("venues")
      .delete()
      .eq("id", venueId);

    if (error) {
      toast({ title: "Error deleting venue", variant: "destructive" });
    } else {
      toast({ title: "Venue deleted successfully" });
      fetchVenues();
    }
  };

  const toggleVenueStatus = async (venueId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("venues")
      .update({ is_active: !currentStatus })
      .eq("id", venueId);

    if (error) {
      toast({ title: "Error updating venue status", variant: "destructive" });
    } else {
      toast({ title: "Venue status updated" });
      fetchVenues();
    }
  };

  const openConfigDialog = (venue: { id: string; name: string }) => {
    setSelectedVenue(venue);
    setConfigDialogOpen(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">My Venues</h2>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Venue
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading venues...</div>
      ) : venues.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">You haven't added any venues yet.</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Venue
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {venues.map((venue) => (
            <Card key={venue.id} className={!venue.has_payment_details || venue.sports_count === 0 ? "border-warning" : ""}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{venue.name}</CardTitle>
                    <CardDescription>{venue.location}</CardDescription>
                  </div>
                  <Badge variant={venue.is_active ? "default" : "secondary"}>
                    {venue.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">{venue.description}</p>
                <p className="font-semibold mb-2">₹{venue.price_per_hour}/hour</p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {venue.sports?.name && (
                    <Badge variant="outline">{venue.sports.name}</Badge>
                  )}
                  {venue.sports_count > 0 && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Dumbbell className="h-3 w-3" />
                      {venue.sports_count} Sports Configured
                    </Badge>
                  )}
                  {venue.has_payment_details ? (
                    <Badge variant="secondary" className="flex items-center gap-1 text-primary">
                      <CreditCard className="h-3 w-3" />
                      UPI Ready
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="flex items-center gap-1 text-warning border-warning">
                      <AlertTriangle className="h-3 w-3" />
                      No Payment Details
                    </Badge>
                  )}
                </div>

                {(!venue.has_payment_details || venue.sports_count === 0) && (
                  <div className="bg-warning/10 text-warning text-sm p-3 rounded-lg mb-4">
                    <AlertTriangle className="h-4 w-4 inline mr-2" />
                    {!venue.has_payment_details && "Add UPI details to receive payments. "}
                    {venue.sports_count === 0 && "Configure sports and tables/courts."}
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => openConfigDialog({ id: venue.id, name: venue.name })}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Configure
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleVenueStatus(venue.id, venue.is_active)}
                  >
                    {venue.is_active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteVenue(venue.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddVenueDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchVenues}
      />

      {selectedVenue && (
        <VenueConfigDialog
          open={configDialogOpen}
          onOpenChange={setConfigDialogOpen}
          venueId={selectedVenue.id}
          venueName={selectedVenue.name}
          onUpdate={fetchVenues}
        />
      )}
    </div>
  );
};

export default ManageVenues;
