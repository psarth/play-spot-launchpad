import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

interface GeneratedSlot {
  start_time: string;
  end_time: string;
  label: string;
  isBooked: boolean;
  isLocked: boolean;
  lockedByMe: boolean;
}

interface UseTableCourtSlotsProps {
  tableCourtId: string | null;
  venueId: string;
  selectedDate: string | null;
  currentUserId: string | null;
}

interface UseTableCourtSlotsReturn {
  slots: GeneratedSlot[];
  loading: boolean;
  refreshSlots: () => Promise<void>;
}

export const useTableCourtSlots = ({
  tableCourtId,
  venueId,
  selectedDate,
  currentUserId,
}: UseTableCourtSlotsProps): UseTableCourtSlotsReturn => {
  const [slots, setSlots] = useState<GeneratedSlot[]>([]);
  const [loading, setLoading] = useState(false);

  const generateSlots = useCallback(async () => {
    if (!selectedDate || !venueId) {
      setSlots([]);
      return;
    }

    setLoading(true);

    try {
      // Release expired locks first
      try {
        await supabase.rpc("release_expired_slot_locks");
      } catch (e) {
        // Ignore if RPC doesn't exist
      }

      // Fetch booked slots
      const bookingsQuery = supabase
        .from("bookings")
        .select("start_time, end_time, table_court_id")
        .eq("venue_id", venueId)
        .eq("booking_date", selectedDate)
        .in("status", ["confirmed", "pending"]);

      if (tableCourtId) {
        bookingsQuery.eq("table_court_id", tableCourtId);
      }

      const { data: bookedSlots } = await bookingsQuery;

      // Fetch locked slots
      const locksQuery = supabase
        .from("slot_locks")
        .select("start_time, locked_by, table_court_id")
        .eq("venue_id", venueId)
        .eq("slot_date", selectedDate)
        .eq("status", "active");

      if (tableCourtId) {
        locksQuery.eq("table_court_id", tableCourtId);
      }

      const { data: lockedSlots } = await locksQuery;

      // Generate time slots (6 AM to 10 PM)
      const generatedSlots: GeneratedSlot[] = [];
      const now = new Date();
      const selectedDateObj = new Date(selectedDate);
      const isToday = selectedDateObj.toDateString() === now.toDateString();

      for (let hour = 6; hour < 22; hour++) {
        const startHour = hour.toString().padStart(2, "0");
        const endHour = (hour + 1).toString().padStart(2, "0");
        const start_time = `${startHour}:00:00`;
        const end_time = `${endHour}:00:00`;

        const isBooked = bookedSlots?.some(
          (b) =>
            b.start_time === start_time ||
            (b.start_time < end_time && b.end_time > start_time)
        ) || false;

        const lockInfo = lockedSlots?.find((l) => l.start_time === start_time);
        const isLocked = !!lockInfo;
        const lockedByMe = lockInfo?.locked_by === currentUserId;

        const isPast = isToday && hour <= now.getHours();

        generatedSlots.push({
          start_time,
          end_time,
          label: `${startHour}:00 - ${endHour}:00`,
          isBooked: isBooked || isPast,
          isLocked: isLocked && !lockedByMe,
          lockedByMe,
        });
      }

      setSlots(generatedSlots);
    } catch (err) {
      console.error("Error generating slots:", err);
    } finally {
      setLoading(false);
    }
  }, [tableCourtId, venueId, selectedDate, currentUserId]);

  useEffect(() => {
    generateSlots();

    if (!venueId || !selectedDate) return;

    // Set up realtime subscriptions
    const channelId = `slots-${venueId}-${selectedDate}-${tableCourtId || "all"}`;
    
    const channel: RealtimeChannel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `venue_id=eq.${venueId}`,
        },
        () => generateSlots()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "slot_locks",
          filter: `venue_id=eq.${venueId}`,
        },
        () => generateSlots()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId, selectedDate, tableCourtId, generateSlots]);

  return {
    slots,
    loading,
    refreshSlots: generateSlots,
  };
};

export default useTableCourtSlots;
