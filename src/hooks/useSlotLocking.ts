import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SlotLock {
  id: string;
  venue_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  expires_at: string;
  status: string;
}

interface UseSlotLockingProps {
  venueId: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  onLockExpired?: () => void;
}

interface UseSlotLockingReturn {
  lockSlot: () => Promise<SlotLock | null>;
  releaseLock: () => Promise<void>;
  isLocked: boolean;
  isLocking: boolean;
  lockData: SlotLock | null;
  timeRemaining: number;
  error: string | null;
}

const LOCK_DURATION_MINUTES = 10;

export const useSlotLocking = ({
  venueId,
  slotDate,
  startTime,
  endTime,
  onLockExpired,
}: UseSlotLockingProps): UseSlotLockingReturn => {
  const [lockData, setLockData] = useState<SlotLock | null>(null);
  const [isLocking, setIsLocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const { toast } = useToast();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const expiryCallbackRef = useRef(onLockExpired);

  // Keep the callback ref updated
  useEffect(() => {
    expiryCallbackRef.current = onLockExpired;
  }, [onLockExpired]);

  // Timer countdown
  useEffect(() => {
    if (!lockData) {
      setTimeRemaining(0);
      return;
    }

    const updateTimer = () => {
      const expiresAt = new Date(lockData.expires_at).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        setLockData(null);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        expiryCallbackRef.current?.();
        toast({
          title: "Slot lock expired",
          description: "Your reserved slot has expired. Please select again.",
          variant: "destructive",
        });
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [lockData, toast]);

  const lockSlot = useCallback(async (): Promise<SlotLock | null> => {
    if (!venueId || !slotDate || !startTime || !endTime) {
      setError("Missing slot information");
      return null;
    }

    setIsLocking(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Please login to book a slot");
        return null;
      }

      // First, release any expired locks
      await supabase.rpc('release_expired_slot_locks');

      // Check if slot is already locked or booked
      const { data: existingLock } = await supabase
        .from("slot_locks")
        .select("*")
        .eq("venue_id", venueId)
        .eq("slot_date", slotDate)
        .eq("start_time", startTime)
        .eq("status", "active")
        .maybeSingle();

      if (existingLock && existingLock.locked_by !== user.id) {
        setError("This slot is currently being booked by another user. Please try again in a few minutes.");
        return null;
      }

      // Check if slot is already booked
      const { data: existingBooking } = await supabase
        .from("bookings")
        .select("id")
        .eq("venue_id", venueId)
        .eq("booking_date", slotDate)
        .eq("start_time", startTime)
        .in("status", ["pending", "confirmed"])
        .maybeSingle();

      if (existingBooking) {
        setError("This slot has already been booked.");
        return null;
      }

      // If user already has a lock, return it
      if (existingLock && existingLock.locked_by === user.id) {
        setLockData(existingLock as SlotLock);
        return existingLock as SlotLock;
      }

      // Create new lock
      const expiresAt = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000).toISOString();
      
      const { data: newLock, error: lockError } = await supabase
        .from("slot_locks")
        .insert({
          venue_id: venueId,
          slot_date: slotDate,
          start_time: startTime,
          end_time: endTime,
          locked_by: user.id,
          expires_at: expiresAt,
          status: "active",
        })
        .select()
        .single();

      if (lockError) {
        if (lockError.code === "23505") {
          setError("This slot was just reserved by another user. Please select a different time.");
        } else {
          setError("Failed to reserve slot. Please try again.");
        }
        return null;
      }

      setLockData(newLock as SlotLock);
      return newLock as SlotLock;
    } catch (err) {
      setError("An unexpected error occurred");
      return null;
    } finally {
      setIsLocking(false);
    }
  }, [venueId, slotDate, startTime, endTime]);

  const releaseLock = useCallback(async () => {
    if (!lockData) return;

    try {
      await supabase
        .from("slot_locks")
        .update({ status: "released" })
        .eq("id", lockData.id);
      
      setLockData(null);
    } catch (err) {
      console.error("Failed to release lock:", err);
    }
  }, [lockData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (lockData) {
        supabase
          .from("slot_locks")
          .update({ status: "released" })
          .eq("id", lockData.id)
          .then(() => {});
      }
    };
  }, []);

  return {
    lockSlot,
    releaseLock,
    isLocked: !!lockData && timeRemaining > 0,
    isLocking,
    lockData,
    timeRemaining,
    error,
  };
};

export default useSlotLocking;
