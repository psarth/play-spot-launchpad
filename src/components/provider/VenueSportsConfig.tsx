import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Minus, Loader2, Dumbbell, Table2, IndianRupee } from "lucide-react";

interface Sport {
  id: string;
  name: string;
}

interface VenueSport {
  id: string;
  sport_id: string;
  sport_name: string;
  price_per_hour: number;
  tables_courts: TableCourt[];
}

interface TableCourt {
  id: string;
  name: string;
  is_active: boolean;
}

interface VenueSportsConfigProps {
  venueId: string;
  venueName: string;
  onUpdate?: () => void;
}

const VenueSportsConfig = ({ venueId, venueName, onUpdate }: VenueSportsConfigProps) => {
  const [allSports, setAllSports] = useState<Sport[]>([]);
  const [venueSports, setVenueSports] = useState<VenueSport[]>([]);
  const [selectedSports, setSelectedSports] = useState<Set<string>>(new Set());
  const [tablesCourtsCount, setTablesCourtsCount] = useState<Record<string, number>>({});
  const [sportPrices, setSportPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, [venueId]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch all sports
    const { data: sportsData } = await supabase
      .from("sports")
      .select("*")
      .order("name");
    
    setAllSports(sportsData || []);

    // Fetch venue sports with tables/courts and price
    const { data: venueSportsData } = await supabase
      .from("venue_sports")
      .select(`
        id,
        sport_id,
        price_per_hour,
        sports:sport_id (name),
        tables_courts (id, name, is_active, display_order)
      `)
      .eq("venue_id", venueId)
      .order("created_at");

    if (venueSportsData) {
      const mapped: VenueSport[] = venueSportsData.map((vs: any) => ({
        id: vs.id,
        sport_id: vs.sport_id,
        sport_name: vs.sports?.name || "Unknown",
        price_per_hour: vs.price_per_hour || 500,
        tables_courts: (vs.tables_courts || []).sort((a: any, b: any) => a.display_order - b.display_order),
      }));
      setVenueSports(mapped);
      
      const selected = new Set(mapped.map((vs) => vs.sport_id));
      setSelectedSports(selected);
      
      const counts: Record<string, number> = {};
      const prices: Record<string, number> = {};
      mapped.forEach((vs) => {
        counts[vs.sport_id] = vs.tables_courts.length;
        prices[vs.sport_id] = vs.price_per_hour;
      });
      setTablesCourtsCount(counts);
      setSportPrices(prices);
    }

    setLoading(false);
  };

  const getTableCourtLabel = (sportName: string): string => {
    const lowerName = sportName.toLowerCase();
    if (lowerName.includes("badminton") || lowerName.includes("tennis") || lowerName.includes("basketball")) {
      return "Courts";
    }
    return "Tables";
  };

  const handleSportToggle = (sportId: string, checked: boolean) => {
    const updated = new Set(selectedSports);
    if (checked) {
      updated.add(sportId);
      if (!tablesCourtsCount[sportId]) {
        setTablesCourtsCount((prev) => ({ ...prev, [sportId]: 1 }));
      }
      if (!sportPrices[sportId]) {
        setSportPrices((prev) => ({ ...prev, [sportId]: 500 }));
      }
    } else {
      updated.delete(sportId);
    }
    setSelectedSports(updated);
  };

  const handleCountChange = (sportId: string, delta: number) => {
    setTablesCourtsCount((prev) => {
      const current = prev[sportId] || 1;
      const newCount = Math.max(1, Math.min(20, current + delta));
      return { ...prev, [sportId]: newCount };
    });
  };

  const handlePriceChange = (sportId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setSportPrices((prev) => ({ ...prev, [sportId]: numValue }));
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      // Get current venue sports
      const currentSportIds = new Set(venueSports.map((vs) => vs.sport_id));
      const newSportIds = selectedSports;

      // Sports to add
      for (const sportId of newSportIds) {
        if (!currentSportIds.has(sportId)) {
          const price = sportPrices[sportId] || 500;
          
          // Insert venue_sport with price
          const { data: newVenueSport, error: vsError } = await supabase
            .from("venue_sports")
            .insert({ 
              venue_id: venueId, 
              sport_id: sportId,
              price_per_hour: price
            })
            .select()
            .single();

          if (vsError) throw vsError;

          // Insert tables/courts
          const count = tablesCourtsCount[sportId] || 1;
          const sport = allSports.find((s) => s.id === sportId);
          const label = sport ? getTableCourtLabel(sport.name) : "Table";
          const singularLabel = label.slice(0, -1); // Remove 's'

          const tablesToInsert = Array.from({ length: count }, (_, i) => ({
            venue_sport_id: newVenueSport.id,
            name: `${singularLabel} ${i + 1}`,
            display_order: i + 1,
            is_active: true,
          }));

          const { error: tcError } = await supabase
            .from("tables_courts")
            .insert(tablesToInsert);

          if (tcError) throw tcError;
        }
      }

      // Sports to remove
      for (const sportId of currentSportIds) {
        if (!newSportIds.has(sportId)) {
          const venueSport = venueSports.find((vs) => vs.sport_id === sportId);
          if (venueSport) {
            const { error } = await supabase
              .from("venue_sports")
              .delete()
              .eq("id", venueSport.id);

            if (error) throw error;
          }
        }
      }

      // Update tables/courts count and price for existing sports
      for (const sportId of newSportIds) {
        if (currentSportIds.has(sportId)) {
          const venueSport = venueSports.find((vs) => vs.sport_id === sportId);
          if (!venueSport) continue;

          // Update price
          const newPrice = sportPrices[sportId] || 500;
          if (newPrice !== venueSport.price_per_hour) {
            await supabase
              .from("venue_sports")
              .update({ price_per_hour: newPrice })
              .eq("id", venueSport.id);
          }

          const currentCount = venueSport.tables_courts.length;
          const newCount = tablesCourtsCount[sportId] || 1;
          const sport = allSports.find((s) => s.id === sportId);
          const label = sport ? getTableCourtLabel(sport.name) : "Table";
          const singularLabel = label.slice(0, -1);

          if (newCount > currentCount) {
            // Add more tables/courts
            const toAdd = Array.from({ length: newCount - currentCount }, (_, i) => ({
              venue_sport_id: venueSport.id,
              name: `${singularLabel} ${currentCount + i + 1}`,
              display_order: currentCount + i + 1,
              is_active: true,
            }));

            const { error } = await supabase.from("tables_courts").insert(toAdd);
            if (error) throw error;
          } else if (newCount < currentCount) {
            // Remove extra tables/courts (from the end)
            const toRemove = venueSport.tables_courts.slice(newCount);
            for (const tc of toRemove) {
              await supabase.from("tables_courts").delete().eq("id", tc.id);
            }
          }
        }
      }

      toast({ title: "Sports configuration saved!" });
      await fetchData();
      onUpdate?.();
    } catch (error: any) {
      toast({ title: "Error saving configuration", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="card-premium">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-primary" />
          Sports & Tables/Courts for {venueName}
        </CardTitle>
        <CardDescription>
          Configure which sports this venue offers, pricing, and tables/courts count
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {allSports.map((sport) => {
            const isSelected = selectedSports.has(sport.id);
            const label = getTableCourtLabel(sport.name);
            const count = tablesCourtsCount[sport.id] || 1;
            const price = sportPrices[sport.id] || 500;

            return (
              <div
                key={sport.id}
                className={`p-5 border-2 rounded-2xl transition-all duration-300 ${
                  isSelected 
                    ? "border-primary/50 bg-gradient-to-br from-primary/5 to-accent/5 shadow-sm" 
                    : "border-border hover:border-primary/20"
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={`sport-${sport.id}`}
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSportToggle(sport.id, !!checked)}
                      className="h-5 w-5"
                    />
                    <Label
                      htmlFor={`sport-${sport.id}`}
                      className="text-base font-semibold cursor-pointer"
                    >
                      {sport.name}
                    </Label>
                  </div>

                  {isSelected && (
                    <div className="flex items-center gap-4 flex-wrap">
                      {/* Price Input */}
                      <div className="flex items-center gap-2">
                        <IndianRupee className="h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          min="1"
                          value={price}
                          onChange={(e) => handlePriceChange(sport.id, e.target.value)}
                          className="w-24 h-9 text-center font-semibold"
                          placeholder="Price"
                        />
                        <span className="text-sm text-muted-foreground">/hr</span>
                      </div>

                      {/* Count Controls */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{label}:</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-xl"
                          onClick={() => handleCountChange(sport.id, -1)}
                          disabled={count <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-bold text-lg">{count}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-xl"
                          onClick={() => handleCountChange(sport.id, 1)}
                          disabled={count >= 20}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {isSelected && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {Array.from({ length: count }, (_, i) => (
                      <Badge 
                        key={i} 
                        variant="secondary" 
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10"
                      >
                        <Table2 className="h-3.5 w-3.5" />
                        {label.slice(0, -1)} {i + 1}
                      </Badge>
                    ))}
                    <Badge className="price-tag">
                      <IndianRupee className="h-3 w-3" />
                      {price}/hr
                    </Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-6 border-t">
          <Button 
            onClick={handleSave} 
            disabled={saving || selectedSports.size === 0}
            className="btn-press px-8"
            size="lg"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Configuration"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default VenueSportsConfig;
