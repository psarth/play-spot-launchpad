import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";
import AddVenueDialog from "./AddVenueDialog";

interface Venue {
  id: string;
  name: string;
  location: string;
  price_per_hour: number;
  is_active: boolean;
  description: string | null;
  sports: { name: string };
}

const ManageVenues = () => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const { data, error } = await supabase
      .from("venues")
      .select(`
        *,
        sports:sport_id (name)
      `)
      .eq("provider_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error fetching venues", variant: "destructive" });
    } else {
      setVenues(data || []);
    }
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
            <Card key={venue.id}>
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
                <p className="font-semibold mb-4">₹{venue.price_per_hour}/hour</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Sport: {venue.sports.name}
                </p>
                <div className="flex gap-2">
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
    </div>
  );
};

export default ManageVenues;
