import { Clock } from "lucide-react";

interface GeneratedSlot {
  start_time: string;
  end_time: string;
  label: string;
  isBooked: boolean;
  isLocked: boolean;
  lockedByMe: boolean;
}

interface SlotGridProps {
  slots: GeneratedSlot[];
  selectedSlot: GeneratedSlot | null;
  onSlotSelect: (slot: GeneratedSlot) => void;
  loading?: boolean;
}

export const SlotGrid = ({ slots, selectedSlot, onSlotSelect, loading }: SlotGridProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton h-14 rounded-lg" />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          No slots available for this date
        </p>
      </div>
    );
  }

  const availableCount = slots.filter(s => !s.isBooked && !s.isLocked).length;

  return (
    <div>
      {/* Slot Count Indicator */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">
          {availableCount} slot{availableCount !== 1 ? 's' : ''} available
        </span>
        {availableCount <= 2 && availableCount > 0 && (
          <span className="urgency-badge">
            Book fast!
          </span>
        )}
      </div>

      {/* Slot Grid - 3-4 columns */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {slots.map((slot, index) => {
          const isSelected = selectedSlot?.start_time === slot.start_time;
          const isUnavailable = slot.isBooked || (slot.isLocked && !slot.lockedByMe);
          
          return (
            <button
              key={index}
              disabled={isUnavailable}
              onClick={() => !isUnavailable && onSlotSelect(slot)}
              className={`
                p-2.5 rounded-lg text-center transition-all duration-200 border-2
                ${isUnavailable 
                  ? 'slot-booked' 
                  : isSelected 
                    ? 'slot-selected' 
                    : 'slot-available'
                }
                ${slot.lockedByMe && !isSelected ? 'ring-2 ring-warning/50' : ''}
              `}
            >
              <span className={`text-sm font-medium ${
                isUnavailable 
                  ? 'text-muted-foreground' 
                  : isSelected 
                    ? 'text-success' 
                    : 'text-foreground'
              }`}>
                {slot.label.split(' - ')[0]}
              </span>
              {slot.isLocked && slot.lockedByMe && (
                <span className="text-[10px] text-warning block mt-0.5">Reserved</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border-2 border-success/40 bg-success/5" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border-2 border-success bg-success/20" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border border-border bg-muted/60" />
          <span>Booked</span>
        </div>
      </div>
    </div>
  );
};

export default SlotGrid;
