import { Clock, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SlotLockTimerProps {
  timeRemaining: number;
  className?: string;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const SlotLockTimer = ({ timeRemaining, className = "" }: SlotLockTimerProps) => {
  const isLow = timeRemaining < 120; // Less than 2 minutes
  const isCritical = timeRemaining < 60; // Less than 1 minute

  if (timeRemaining <= 0) return null;

  return (
    <Alert
      className={`${className} ${
        isCritical
          ? "border-destructive bg-destructive/10"
          : isLow
          ? "border-warning bg-warning/10"
          : "border-primary bg-primary/10"
      }`}
    >
      <div className="flex items-center gap-2">
        {isCritical ? (
          <AlertTriangle className="h-4 w-4 text-destructive animate-pulse" />
        ) : (
          <Clock className={`h-4 w-4 ${isLow ? "text-warning" : "text-primary"}`} />
        )}
        <AlertDescription
          className={`font-medium ${
            isCritical ? "text-destructive" : isLow ? "text-warning" : "text-primary"
          }`}
        >
          {isCritical
            ? `Hurry! Slot reserved for ${formatTime(timeRemaining)}`
            : isLow
            ? `Complete payment in ${formatTime(timeRemaining)}`
            : `Slot reserved for ${formatTime(timeRemaining)}`}
        </AlertDescription>
      </div>
    </Alert>
  );
};

export default SlotLockTimer;
