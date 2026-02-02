import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Search, TrendingUp, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import FilterChips from "@/components/home/FilterChips";
import VenueCardMobile from "@/components/home/VenueCardMobile";
import RepeatBookingSection from "@/components/home/RepeatBookingSection";

interface VenueSport {
  sport_name: string;
  tables_count: number;
  price_per_hour: number;
}

interface Venue {
  id: string;
  name: string;
  location: string;
  images: string[] | null;
  average_rating: number | null;
  total_reviews: number | null;
  venue_sports: VenueSport[];
  has_payment: boolean;
  next_available_slot?: string;
  available_slots_count?: number;
}

const MobileHome = () => {
  const navigate = useNavigate();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Filter states
  const [selectedSport, setSelectedSport] = useState("all");
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState("all");
  const [selectedPriceRange, setSelectedPriceRange] = useState("all");
  const [showAvailableNow, setShowAvailableNow] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchVenues();

    const channel = supabase
      .channel('venues-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'venues' }, () => fetchVenues())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    filterVenues();
  }, [selectedSport, selectedTimeOfDay, selectedPriceRange, showAvailableNow, searchQuery, venues]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsLoggedIn(!!user);
  };

  const fetchVenues = async () => {
    setLoading(true);
    const { data: venuesData } = await supabase
      .from("venues")
      .select(`*, sports:sport_id (name)`)
      .eq("is_active", true);

    if (!venuesData) {
      setVenues([]);
      setFilteredVenues([]);
      setLoading(false);
      return;
    }

    // Fetch additional data for each venue
    const venuesWithDetails = await Promise.all(
      venuesData.map(async (venue) => {
        // Fetch venue sports with tables count and per-sport pricing
        const { data: venueSportsData } = await supabase
          .from("venue_sports")
          .select(`
            sport_id,
            price_per_hour,
            sports:sport_id (name),
            tables_courts (id)
          `)
          .eq("venue_id", venue.id);

        const venueSports: VenueSport[] = (venueSportsData || []).map((vs: any) => ({
          sport_name: vs.sports?.name || "Unknown",
          tables_count: vs.tables_courts?.length || 0,
          price_per_hour: vs.price_per_hour || venue.price_per_hour,
        }));

        // Check if venue has payment details
        const { data: paymentData } = await supabase
          .from("venue_payment_details")
          .select("id")
          .eq("venue_id", venue.id)
          .eq("is_active", true)
          .maybeSingle();

        // Mock next available slot (in production, calculate from time_slots)
        const hours = new Date().getHours();
        const nextSlotHour = hours < 12 ? 12 : hours < 18 ? 18 : 20;
        const nextAvailable = `${nextSlotHour > 12 ? nextSlotHour - 12 : nextSlotHour}:00 ${nextSlotHour >= 12 ? 'PM' : 'AM'}`;

        return {
          ...venue,
          venue_sports: venueSports,
          has_payment: !!paymentData,
          next_available_slot: nextAvailable,
          available_slots_count: Math.floor(Math.random() * 6) + 1,
        };
      })
    );

    // Only show venues that have payment details and sports configured
    const readyVenues = venuesWithDetails.filter(v => v.has_payment && v.venue_sports.length > 0);
    
    // Sort by availability (earliest slot first)
    readyVenues.sort((a, b) => (b.available_slots_count || 0) - (a.available_slots_count || 0));
    
    setVenues(readyVenues);
    setFilteredVenues(readyVenues);
    setLoading(false);
  };

  const filterVenues = async () => {
    let filtered = [...venues];

    // Sport filter
    if (selectedSport !== "all") {
      const { data: sportData } = await supabase
        .from("sports")
        .select("name")
        .eq("id", selectedSport)
        .single();
      
      if (sportData) {
        filtered = filtered.filter(v => 
          v.venue_sports.some(vs => vs.sport_name === sportData.name)
        );
      }
    }

    // Price filter
    if (selectedPriceRange !== "all") {
      const maxPrice = selectedPriceRange === "under800" ? 800 
        : selectedPriceRange === "under1200" ? 1200 
        : 1500;
      
      filtered = filtered.filter(v => 
        v.venue_sports.some(vs => vs.price_per_hour <= maxPrice)
      );
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(v =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredVenues(filtered);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="px-4 py-3">
          {/* Logo Row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-primary rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="font-heading font-bold text-lg">SportSpot</span>
            </div>
            
            {isLoggedIn ? (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate("/my-bookings")}
                className="text-sm"
              >
                My Bookings
              </Button>
            ) : (
              <Button 
                size="sm"
                onClick={() => navigate("/login")}
                className="text-sm btn-press"
              >
                Login
              </Button>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search venues or locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-xl bg-muted border-0"
            />
          </div>
        </div>

        {/* Filter Chips */}
        <FilterChips
          selectedSport={selectedSport}
          onSportChange={setSelectedSport}
          selectedTimeOfDay={selectedTimeOfDay}
          onTimeOfDayChange={setSelectedTimeOfDay}
          selectedPriceRange={selectedPriceRange}
          onPriceRangeChange={setSelectedPriceRange}
          showAvailableNow={showAvailableNow}
          onAvailableNowChange={setShowAvailableNow}
        />
      </header>

      {/* Main Content */}
      <main className="px-4 py-4">
        {/* Repeat Booking Section (for logged in users) */}
        {isLoggedIn && <RepeatBookingSection />}

        {/* Featured Venues Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-heading font-bold text-lg">Available Now</h1>
            <p className="text-xs text-muted-foreground">
              {filteredVenues.length} venue{filteredVenues.length !== 1 ? 's' : ''} ready to book
            </p>
          </div>
          
          {/* Trust Signal */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            <Users className="h-3 w-3" />
            <span>120+ bookings today</span>
          </div>
        </div>

        {/* Venue Grid - 2 columns on mobile */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[3/4] rounded-xl" />
            ))}
          </div>
        ) : filteredVenues.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="font-medium mb-1">No venues found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Try adjusting your filters
            </p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSelectedSport("all");
                setSelectedPriceRange("all");
                setSelectedTimeOfDay("all");
                setSearchQuery("");
              }}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredVenues.map((venue) => (
              <VenueCardMobile
                key={venue.id}
                venue={venue}
                nextAvailableSlot={venue.next_available_slot}
                availableSlotsCount={venue.available_slots_count}
              />
            ))}
          </div>
        )}

        {/* Bottom Padding for mobile */}
        <div className="h-20" />
      </main>

      {/* Bottom Nav (simplified) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border px-4 py-2 z-50">
        <div className="flex items-center justify-around">
          <button className="flex flex-col items-center gap-0.5 text-primary">
            <MapPin className="h-5 w-5" />
            <span className="text-[10px] font-medium">Venues</span>
          </button>
          <button 
            onClick={() => navigate("/my-bookings")}
            className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-primary transition-colors"
          >
            <TrendingUp className="h-5 w-5" />
            <span className="text-[10px] font-medium">Bookings</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default MobileHome;
