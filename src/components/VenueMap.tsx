import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";

interface MapLocation {
  lat: number;
  lng: number;
  name?: string;
  address?: string;
}

interface VenueMapProps {
  location?: MapLocation;
  locations?: MapLocation[];
  className?: string;
  zoom?: number;
  showMarker?: boolean;
  onMarkerClick?: (location: MapLocation) => void;
}

export const VenueMap = ({
  location,
  locations = [],
  className = "",
  zoom = 15,
  showMarker = true,
  onMarkerClick,
}: VenueMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default to Bangalore center if no location provided
  const defaultCenter = { lat: 12.9716, lng: 77.5946 };
  const center = location || (locations.length > 0 ? locations[0] : defaultCenter);

  useEffect(() => {
    if (!mapRef.current) return;

    // Check if Google Maps is available
    if (!window.google?.maps) {
      // Show a static map placeholder
      setError("Map loading...");
      
      // Try loading the script
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
      if (!apiKey) {
        setError("Map unavailable");
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      script.async = true;
      script.onload = () => initMap();
      script.onerror = () => setError("Failed to load map");
      document.head.appendChild(script);
      return;
    }

    initMap();
  }, [location, locations, zoom]);

  const initMap = () => {
    if (!mapRef.current || !window.google?.maps) return;

    try {
      const map = new window.google.maps.Map(mapRef.current, {
        center,
        zoom,
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      });

      // Add marker for single location
      if (location && showMarker) {
        const marker = new window.google.maps.Marker({
          position: location,
          map,
          title: location.name || "Venue Location",
          animation: window.google.maps.Animation.DROP,
        });

        if (onMarkerClick) {
          marker.addListener("click", () => onMarkerClick(location));
        }
      }

      // Add markers for multiple locations
      if (locations.length > 0) {
        const bounds = new window.google.maps.LatLngBounds();
        
        locations.forEach((loc) => {
          const marker = new window.google.maps.Marker({
            position: loc,
            map,
            title: loc.name || "Venue",
          });

          bounds.extend(loc);

          if (onMarkerClick) {
            marker.addListener("click", () => onMarkerClick(loc));
          }
        });

        if (locations.length > 1) {
          map.fitBounds(bounds);
        }
      }

      setMapLoaded(true);
      setError(null);
    } catch (err) {
      setError("Failed to initialize map");
    }
  };

  // Show placeholder if map can't load
  if (error) {
    return (
      <div className={`relative rounded-xl overflow-hidden bg-muted ${className}`}>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {error === "Map loading..." ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <>
              <MapPin className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">{error}</span>
            </>
          )}
        </div>
        {/* Static map fallback */}
        <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50" />
      </div>
    );
  }

  return (
    <div className={`relative rounded-xl overflow-hidden ${className}`}>
      <div ref={mapRef} className="w-full h-full min-h-[200px]" />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
};

export default VenueMap;

// Extend Window interface for Google Maps
declare global {
  interface Window {
    google: any;
  }
}
