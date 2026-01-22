import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

interface RealtimeBooking {
  id: string;
  venue_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface RealtimeSlotLock {
  id: string;
  venue_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  status: string;
  locked_by: string;
}

interface UseRealtimeBookingsProps {
  venueId: string;
  selectedDate?: string;
  onBookingChange?: () => void;
  onSlotLockChange?: () => void;
}

export const useRealtimeBookings = ({
  venueId,
  selectedDate,
  onBookingChange,
  onSlotLockChange,
}: UseRealtimeBookingsProps) => {
  const [lockedSlots, setLockedSlots] = useState<RealtimeSlotLock[]>([]);
  const [bookedSlots, setBookedSlots] = useState<RealtimeBooking[]>([]);

  const fetchLockedSlots = useCallback(async () => {
    if (!venueId || !selectedDate) return;

    // Release expired locks first
    try {
      await supabase.rpc('release_expired_slot_locks');
    } catch (e) {
      // Ignore if RPC doesn't exist yet
    }

    const { data } = await supabase
      .from("slot_locks")
      .select("*")
      .eq("venue_id", venueId)
      .eq("slot_date", selectedDate)
      .eq("status", "active");

    setLockedSlots(data || []);
  }, [venueId, selectedDate]);

  const fetchBookedSlots = useCallback(async () => {
    if (!venueId || !selectedDate) return;

    const { data } = await supabase
      .from("bookings")
      .select("id, venue_id, booking_date, start_time, end_time, status")
      .eq("venue_id", venueId)
      .eq("booking_date", selectedDate)
      .in("status", ["pending", "confirmed"]);

    setBookedSlots(data || []);
  }, [venueId, selectedDate]);

  useEffect(() => {
    if (!venueId || !selectedDate) return;

    fetchLockedSlots();
    fetchBookedSlots();

    // Set up realtime subscriptions
    const bookingsChannel: RealtimeChannel = supabase
      .channel(`bookings-${venueId}-${selectedDate}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `venue_id=eq.${venueId}`,
        },
        (payload) => {
          fetchBookedSlots();
          onBookingChange?.();
        }
      )
      .subscribe();

    const locksChannel: RealtimeChannel = supabase
      .channel(`slot_locks-${venueId}-${selectedDate}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "slot_locks",
          filter: `venue_id=eq.${venueId}`,
        },
        (payload) => {
          fetchLockedSlots();
          onSlotLockChange?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(locksChannel);
    };
  }, [venueId, selectedDate, fetchLockedSlots, fetchBookedSlots, onBookingChange, onSlotLockChange]);

  const isSlotLocked = useCallback(
    (startTime: string, currentUserId?: string): boolean => {
      const lock = lockedSlots.find(
        (lock) => lock.start_time === startTime && lock.status === "active"
      );
      if (!lock) return false;
      // If the current user has the lock, it's not "locked" for them
      if (currentUserId && lock.locked_by === currentUserId) return false;
      return true;
    },
    [lockedSlots]
  );

  const isSlotBooked = useCallback(
    (startTime: string): boolean => {
      return bookedSlots.some(
        (booking) =>
          booking.start_time === startTime &&
          ["pending", "confirmed"].includes(booking.status)
      );
    },
    [bookedSlots]
  );

  return {
    lockedSlots,
    bookedSlots,
    isSlotLocked,
    isSlotBooked,
    refreshSlots: () => {
      fetchLockedSlots();
      fetchBookedSlots();
    },
  };
};

export default useRealtimeBookings;
