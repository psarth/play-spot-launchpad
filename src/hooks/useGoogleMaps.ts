import { useState, useEffect, useCallback } from "react";

declare global {
  interface Window {
    google: any;
  }
}

interface UseGoogleMapsOptions {
  apiKey?: string;
  libraries?: string[];
}

interface Location {
  lat: number;
  lng: number;
}

export const useGoogleMaps = (options: UseGoogleMapsOptions = {}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<Location | null>(null);

  // Load Google Maps script
  useEffect(() => {
    // Use a placeholder key or load from env
    const apiKey = options.apiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
    
    if (!apiKey) {
      // Maps will work in limited mode without API key
      console.warn("Google Maps API key not configured. Some features may be limited.");
    }

    if (window.google?.maps) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${options.libraries?.join(",") || "places"}`;
    script.async = true;
    script.defer = true;

    script.onload = () => setIsLoaded(true);
    script.onerror = () => setError("Failed to load Google Maps");

    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
    };
  }, [options.apiKey, options.libraries]);

  // Get user's current location
  const getCurrentLocation = useCallback((): Promise<Location> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
          resolve(location);
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  // Calculate distance between two points (in km)
  const calculateDistance = useCallback((from: Location, to: Location): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((to.lat - from.lat) * Math.PI) / 180;
    const dLon = ((to.lng - from.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((from.lat * Math.PI) / 180) *
        Math.cos((to.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  // Format distance for display
  const formatDistance = useCallback((km: number): string => {
    if (km < 1) {
      return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(1)} km`;
  }, []);

  // Geocode an address to coordinates
  const geocodeAddress = useCallback(async (address: string): Promise<Location | null> => {
    if (!isLoaded || !window.google?.maps) {
      console.warn("Google Maps not loaded");
      return null;
    }

    const geocoder = new window.google.maps.Geocoder();
    
    return new Promise((resolve) => {
      geocoder.geocode({ address }, (results: any[], status: string) => {
        if (status === "OK" && results[0]) {
          resolve({
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng(),
          });
        } else {
          resolve(null);
        }
      });
    });
  }, [isLoaded]);

  return {
    isLoaded,
    error,
    userLocation,
    getCurrentLocation,
    calculateDistance,
    formatDistance,
    geocodeAddress,
  };
};

export default useGoogleMaps;
