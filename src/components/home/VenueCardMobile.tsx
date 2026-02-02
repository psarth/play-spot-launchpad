import { useNavigate } from "react-router-dom";
import { MapPin, Clock, Star, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VenueSport {
  sport_name: string;
  tables_count: number;
  price_per_hour: number;
}

interface VenueCardMobileProps {
  venue: {
    id: string;
    name: string;
    location: string;
    images: string[] | null;
    average_rating: number | null;
    total_reviews: number | null;
    venue_sports: VenueSport[];
  };
  nextAvailableSlot?: string;
  availableSlotsCount?: number;
}

const sportIcons: Record<string, string> = {
  "Cricket": "🏏",
  "Badminton": "🏸",
  "Tennis": "🎾",
  "Football": "⚽",
  "Pool": "🎱",
  "Snooker": "🎱",
  "Table Tennis": "🏓",
};

export const VenueCardMobile = ({ 
  venue, 
  nextAvailableSlot = "6:00 PM",
  availableSlotsCount = 4,
}: VenueCardMobileProps) => {
  const navigate = useNavigate();

  // Calculate price range
  const prices = venue.venue_sports.map(vs => vs.price_per_hour);
  const minPrice = prices.length > 0 ? Math.min(...prices) : 500;

  // Get sport icons for display
  const sportsList = venue.venue_sports.slice(0, 3).map(vs => ({
    name: vs.sport_name,
    icon: sportIcons[vs.sport_name] || "🏟️",
  }));

  const isLowSlots = availableSlotsCount <= 2;

  return (
    <div 
      className="venue-card-mobile cursor-pointer active:scale-[0.98] transition-transform duration-150"
      onClick={() => navigate(`/book-venue/${venue.id}`)}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        {venue.images && venue.images[0] ? (
          <img 
            src={venue.images[0]} 
            alt={venue.name} 
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
            <MapPin className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
        
        {/* Sport Icons Overlay */}
        <div className="absolute top-2 left-2 flex gap-1">
          {sportsList.map((sport, idx) => (
            <span 
              key={idx} 
              className="w-6 h-6 bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center text-xs"
              title={sport.name}
            >
              {sport.icon}
            </span>
          ))}
        </div>

        {/* Rating Badge */}
        {venue.average_rating && venue.average_rating > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-background/90 backdrop-blur-sm px-1.5 py-0.5 rounded text-xs font-medium">
            <Star className="h-3 w-3 fill-warning text-warning" />
            {venue.average_rating.toFixed(1)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Venue Name */}
        <h3 className="font-semibold text-sm line-clamp-1 mb-0.5">
          {venue.name}
        </h3>

        {/* Location */}
        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
          <MapPin className="h-3 w-3" />
          <span className="line-clamp-1">{venue.location}</span>
        </p>

        {/* Availability & Price Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5 min-w-0">
            {/* Next Available */}
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-success" />
              <span className="text-xs font-medium text-success">
                {nextAvailableSlot}
              </span>
            </div>
            
            {/* Slots Count with Urgency */}
            {isLowSlots ? (
              <span className="urgency-badge">
                Last {availableSlotsCount} slot{availableSlotsCount !== 1 ? 's' : ''}
              </span>
            ) : (
              <span className="availability-badge">
                {availableSlotsCount} slots today
              </span>
            )}
          </div>

          {/* Price & Book CTA */}
          <div className="flex flex-col items-end gap-1">
            <span className="text-sm font-bold text-primary">
              ₹{minPrice}/hr
            </span>
            <div className="flex items-center gap-0.5 text-xs text-primary font-medium">
              Book <ChevronRight className="h-3 w-3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VenueCardMobile;
