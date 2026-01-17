import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, Star, Shield, Smartphone, Clock } from "lucide-react";
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
  average_rating: number | null;
  total_reviews: number | null;
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

    const channel = supabase
      .channel('venues-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'venues' }, () => fetchVenues())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    filterVenues();
  }, [selectedSport, searchQuery, venues]);

  const fetchSports = async () => {
    const { data } = await supabase.from("sports").select("*").order("name");
    setSports(data || []);
  };

  const fetchVenues = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("venues")
      .select(`*, sports:sport_id (name)`)
      .eq("is_active", true);
    setVenues(data || []);
    setFilteredVenues(data || []);
    setLoading(false);
  };

  const filterVenues = () => {
    let filtered = venues;
    if (selectedSport !== "all") {
      filtered = filtered.filter((v) => v.sports?.name === sports.find((s) => s.id === selectedSport)?.name);
    }
    if (searchQuery) {
      filtered = filtered.filter((v) =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredVenues(filtered);
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-8 sm:py-12 pt-24">
        <div className="mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 sm:mb-3">Browse Venues</h1>
          <p className="text-muted-foreground text-base sm:text-lg">Find and book verified sports facilities near you</p>
          <div className="flex flex-wrap gap-3 mt-4">
            <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
              <Shield className="h-3 w-3" /> All Venues Verified
            </Badge>
            <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
              <Smartphone className="h-3 w-3" /> UPI Payments
            </Badge>
          </div>
        </div>

        <Card className="mb-6 sm:mb-8 p-4 sm:p-6 border-0 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 sm:h-5 w-4 sm:w-5 text-muted-foreground" />
              <Input
                placeholder="Search by venue name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 sm:pl-12 h-11 sm:h-12 rounded-xl text-sm sm:text-base"
              />
            </div>
            <Select value={selectedSport} onValueChange={setSelectedSport}>
              <SelectTrigger className="w-full sm:w-[200px] h-11 sm:h-12 rounded-xl text-sm sm:text-base">
                <SelectValue placeholder="Filter by sport" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sports</SelectItem>
                {sports.map((sport) => (
                  <SelectItem key={sport.id} value={sport.id}>{sport.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {loading ? (
          <div className="text-center py-16 sm:py-20">
            <div className="inline-block h-8 w-8 sm:h-10 sm:w-10 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground text-sm sm:text-base">Finding venues for you...</p>
          </div>
        ) : filteredVenues.length === 0 ? (
          <Card className="text-center py-12 sm:py-16 border-dashed">
            <CardContent>
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">No Venues Available Yet</h3>
              <p className="text-muted-foreground mb-6 text-base">New venues are being added. Check back soon!</p>
              <Button onClick={() => { setSearchQuery(""); setSelectedSport("all"); }}>Clear Filters</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredVenues.map((venue) => (
              <Card key={venue.id} className="group overflow-hidden hover:shadow-xl hover:border-primary/30 transition-all duration-300 cursor-pointer">
                {venue.images && venue.images[0] ? (
                  <div className="relative h-44 sm:h-52 overflow-hidden">
                    <img src={venue.images[0]} alt={venue.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-primary/90 backdrop-blur-sm">{venue.sports?.name}</Badge>
                    </div>
                    <div className="absolute top-3 right-3">
                      <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm font-bold">₹{venue.price_per_hour}/hr</Badge>
                    </div>
                    <div className="absolute bottom-3 left-3">
                      <Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-xs gap-1">
                        <Shield className="h-3 w-3" /> Verified
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="h-44 sm:h-52 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                    <MapPin className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50" />
                  </div>
                )}
                <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-5">
                  <CardTitle className="text-lg sm:text-xl">{venue.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1.5 text-xs sm:text-sm">
                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                    {venue.location}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-3 sm:pb-4 px-4 sm:px-5">
                  {venue.average_rating && venue.average_rating > 0 && (
                    <div className="flex items-center gap-1 mb-2">
                      <Star className="h-4 w-4 fill-warning text-warning" />
                      <span className="font-semibold text-sm">{venue.average_rating}</span>
                      <span className="text-xs text-muted-foreground">({venue.total_reviews} reviews)</span>
                    </div>
                  )}
                  {venue.amenities && venue.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {venue.amenities.slice(0, 3).map((amenity, index) => (
                        <span key={index} className="text-[10px] sm:text-xs bg-muted px-2 py-0.5 sm:py-1 rounded-full">{amenity}</span>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-0 px-4 sm:px-5 pb-4 sm:pb-5">
                  <Button onClick={() => navigate(`/book-venue/${venue.id}`)} className="w-full rounded-xl font-semibold h-10 sm:h-11 text-sm sm:text-base" size="lg">
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