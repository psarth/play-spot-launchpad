import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dumbbell, Clock, IndianRupee, Sun, Moon, Sunset } from "lucide-react";

interface Sport {
  id: string;
  name: string;
  icon: string | null;
}

interface FilterChipsProps {
  selectedSport: string;
  onSportChange: (sportId: string) => void;
  selectedTimeOfDay: string;
  onTimeOfDayChange: (time: string) => void;
  selectedPriceRange: string;
  onPriceRangeChange: (range: string) => void;
  showAvailableNow: boolean;
  onAvailableNowChange: (show: boolean) => void;
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

export const FilterChips = ({
  selectedSport,
  onSportChange,
  selectedTimeOfDay,
  onTimeOfDayChange,
  selectedPriceRange,
  onPriceRangeChange,
  showAvailableNow,
  onAvailableNowChange,
}: FilterChipsProps) => {
  const [sports, setSports] = useState<Sport[]>([]);

  useEffect(() => {
    const fetchSports = async () => {
      const { data } = await supabase.from("sports").select("*").order("name");
      setSports(data || []);
    };
    fetchSports();
  }, []);

  const timeOptions = [
    { value: "all", label: "Any Time", icon: Clock },
    { value: "morning", label: "Morning", icon: Sun },
    { value: "evening", label: "Evening", icon: Sunset },
    { value: "night", label: "Night", icon: Moon },
  ];

  const priceOptions = [
    { value: "all", label: "Any Price" },
    { value: "under800", label: "Under ₹800" },
    { value: "under1200", label: "Under ₹1200" },
    { value: "under1500", label: "Under ₹1500" },
  ];

  return (
    <div className="sticky top-16 z-40 bg-background/95 backdrop-blur-lg border-b border-border py-3 -mx-4 px-4">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {/* Available Now Toggle */}
        <button
          onClick={() => onAvailableNowChange(!showAvailableNow)}
          className={`filter-chip ${showAvailableNow ? 'filter-chip-active' : 'filter-chip-inactive'}`}
        >
          <Clock className="h-3.5 w-3.5" />
          Available Now
        </button>

        {/* Sport Filters */}
        <button
          onClick={() => onSportChange("all")}
          className={`filter-chip ${selectedSport === "all" ? 'filter-chip-active' : 'filter-chip-inactive'}`}
        >
          <Dumbbell className="h-3.5 w-3.5" />
          All Sports
        </button>
        
        {sports.map((sport) => (
          <button
            key={sport.id}
            onClick={() => onSportChange(sport.id)}
            className={`filter-chip ${selectedSport === sport.id ? 'filter-chip-active' : 'filter-chip-inactive'}`}
          >
            <span className="text-sm">{sportIcons[sport.name] || "🏟️"}</span>
            {sport.name}
          </button>
        ))}

        {/* Divider */}
        <div className="w-px bg-border mx-1 flex-shrink-0" />

        {/* Time of Day */}
        {timeOptions.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              onClick={() => onTimeOfDayChange(option.value)}
              className={`filter-chip ${selectedTimeOfDay === option.value ? 'filter-chip-active' : 'filter-chip-inactive'}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {option.label}
            </button>
          );
        })}

        {/* Divider */}
        <div className="w-px bg-border mx-1 flex-shrink-0" />

        {/* Price Range */}
        {priceOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onPriceRangeChange(option.value)}
            className={`filter-chip ${selectedPriceRange === option.value ? 'filter-chip-active' : 'filter-chip-inactive'}`}
          >
            {option.value !== "all" && <IndianRupee className="h-3.5 w-3.5" />}
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FilterChips;
