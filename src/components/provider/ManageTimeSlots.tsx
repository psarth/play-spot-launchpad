import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Clock, Plus, Trash2 } from "lucide-react";

interface Venue {
  id: string;
  name: string;
}

interface TimeSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const ManageTimeSlots = () => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchVenues();
  }, []);

  useEffect(() => {
    if (selectedVenue && selectedDate) {
      fetchTimeSlots();
    }
  }, [selectedVenue, selectedDate]);

  const fetchVenues = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("venues")
      .select("id, name")
      .eq("provider_id", user.id)
      .order("name");

    if (data) setVenues(data);
  };

  const fetchTimeSlots = async () => {
    if (!selectedVenue || !selectedDate) return;
    setLoading(true);

    const dateStr = selectedDate.toISOString().split("T")[0];
    const { data } = await supabase
      .from("time_slots")
      .select("*")
      .eq("venue_id", selectedVenue)
      .eq("date", dateStr)
      .order("start_time");

    setTimeSlots(data || []);
    setLoading(false);
  };

  const generateDefaultSlots = async () => {
    if (!selectedVenue || !selectedDate) return;

    const dateStr = selectedDate.toISOString().split("T")[0];
    const slots = [];

    // Generate 1-hour slots from 6 AM to 10 PM
    for (let hour = 6; hour < 22; hour++) {
      const startHour = hour.toString().padStart(2, "0");
      const endHour = (hour + 1).toString().padStart(2, "0");
      slots.push({
        venue_id: selectedVenue,
        date: dateStr,
        start_time: `${startHour}:00:00`,
        end_time: `${endHour}:00:00`,
        is_available: true,
      });
    }

    const { error } = await supabase.from("time_slots").insert(slots);

    if (error) {
      if (error.code === "23505") {
        toast({ title: "Slots already exist for this date", variant: "destructive" });
      } else {
        toast({ title: "Error creating slots", variant: "destructive" });
      }
    } else {
      toast({ title: "Time slots created successfully" });
      fetchTimeSlots();
    }
  };

  const toggleSlotAvailability = async (slotId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("time_slots")
      .update({ is_available: !currentStatus })
      .eq("id", slotId);

    if (error) {
      toast({ title: "Error updating slot", variant: "destructive" });
    } else {
      fetchTimeSlots();
    }
  };

  const deleteSlot = async (slotId: string) => {
    const { error } = await supabase
      .from("time_slots")
      .delete()
      .eq("id", slotId);

    if (error) {
      toast({ title: "Error deleting slot", variant: "destructive" });
    } else {
      toast({ title: "Slot deleted" });
      fetchTimeSlots();
    }
  };

  if (venues.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Add a venue first to manage time slots.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Select value={selectedVenue} onValueChange={setSelectedVenue}>
            <SelectTrigger>
              <SelectValue placeholder="Select a venue" />
            </SelectTrigger>
            <SelectContent>
              {venues.map((venue) => (
                <SelectItem key={venue.id} value={venue.id}>
                  {venue.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedVenue && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Date</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-lg border"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg">Time Slots</CardTitle>
                  <CardDescription>
                    {selectedDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                  </CardDescription>
                </div>
                <Button size="sm" onClick={generateDefaultSlots}>
                  <Plus className="h-4 w-4 mr-1" />
                  Generate Slots
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : timeSlots.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No time slots for this date.</p>
                  <p className="text-sm">Click "Generate Slots" to create default slots.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {timeSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}
                        </span>
                        <Badge variant={slot.is_available ? "default" : "secondary"}>
                          {slot.is_available ? "Available" : "Blocked"}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleSlotAvailability(slot.id, slot.is_available)}
                        >
                          {slot.is_available ? "Block" : "Unblock"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSlot(slot.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ManageTimeSlots;
