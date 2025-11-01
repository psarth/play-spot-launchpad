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
    <div className="min-h-screen flex flex-col bg-secondary/30">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Browse Venues</h1>
          <p className="text-muted-foreground text-lg">Find and book your perfect sports facility</p>
        </div>

        {/* Search and Filter Section */}
        <Card className="mb-8 p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by venue name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 rounded-xl text-base"
              />
            </div>
            <Select value={selectedSport} onValueChange={setSelectedSport}>
              <SelectTrigger className="w-full md:w-[220px] h-12 rounded-xl text-base">
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
        </Card>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Finding perfect venues for you...</p>
          </div>
        ) : filteredVenues.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <p className="text-muted-foreground mb-6 text-lg">No venues found matching your criteria.</p>
              <Button onClick={() => { setSearchQuery(""); setSelectedSport("all"); }}>Clear Filters</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVenues.map((venue) => (
              <Card key={venue.id} className="group overflow-hidden hover:shadow-[var(--shadow-glow)] transition-all duration-300 cursor-pointer">
                {venue.images && venue.images[0] ? (
                  <div className="relative h-52 overflow-hidden">
                    <img
                      src={venue.images[0]}
                      alt={venue.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3">
                      <span className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-sm font-semibold shadow-lg">
                        ₹{venue.price_per_hour}/hr
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="h-52 bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                    <MapPin className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">{venue.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1.5 text-sm">
                    <MapPin className="h-4 w-4" />
                    {venue.location}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-4">
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {venue.description || "Premium sports facility"}
                  </p>
                  {venue.amenities && venue.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {venue.amenities.slice(0, 3).map((amenity, index) => (
                        <span key={index} className="text-xs bg-secondary px-2.5 py-1 rounded-full border">
                          {amenity}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-0">
                  <Button
                    onClick={() => navigate(`/book-venue/${venue.id}`)}
                    className="w-full rounded-xl font-semibold h-11"
                    size="lg"
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
