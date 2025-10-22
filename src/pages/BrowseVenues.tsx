import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Sport {
  id: string;
  name: string;
  icon: string | null;
}

interface Venue {
  id: string;
  name: string;
  description: string | null;
  location: string;
  address: string | null;
  price_per_hour: number;
  images: string[] | null;
  amenities: string[] | null;
  sports: { name: string };
}

const BrowseVenues = () => {
  const [sports, setSports] = useState<Sport[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>([]);
  const [selectedSport, setSelectedSport] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchSports();
    fetchVenues();

    // Set up realtime subscription for venues
    const channel = supabase
      .channel('venues-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'venues'
        },
        (payload) => {
          console.log('Venue change detected:', payload);
          fetchVenues(); // Refresh venues when any change occurs
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterVenues();
  }, [selectedSport, searchQuery, venues]);

  const fetchSports = async () => {
    const { data, error } = await supabase
      .from("sports")
      .select("*")
      .order("name");

    if (error) {
      toast({ title: "Error fetching sports", variant: "destructive" });
    } else {
      setSports(data || []);
    }
  };

  const fetchVenues = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("venues")
      .select(`
        *,
        sports:sport_id (name)
      `)
      .eq("is_active", true);

    if (error) {
      toast({ title: "Error fetching venues", variant: "destructive" });
    } else {
      setVenues(data || []);
      setFilteredVenues(data || []);
    }
    setLoading(false);
  };

  const filterVenues = () => {
    let filtered = venues;

    if (selectedSport !== "all") {
      filtered = filtered.filter(
        (venue) => venue.sports?.name === sports.find((s) => s.id === selectedSport)?.name
      );
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (venue) =>
          venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          venue.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredVenues(filtered);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Browse Venues</h1>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by venue name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedSport} onValueChange={setSelectedSport}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Filter by sport" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sports</SelectItem>
              {sports.map((sport) => (
                <SelectItem key={sport.id} value={sport.id}>
                  {sport.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading venues...</div>
        ) : filteredVenues.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No venues found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVenues.map((venue) => (
              <Card key={venue.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {venue.images && venue.images[0] && (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={venue.images[0]}
                      alt={venue.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{venue.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {venue.location}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">{venue.description}</p>
                  <p className="text-lg font-semibold">₹{venue.price_per_hour}/hour</p>
                  {venue.amenities && venue.amenities.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {venue.amenities.slice(0, 3).map((amenity, index) => (
                        <span key={index} className="text-xs bg-secondary px-2 py-1 rounded">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => navigate(`/book-venue/${venue.id}`)}
                    className="w-full"
                  >
                    Book Now
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default BrowseVenues;
