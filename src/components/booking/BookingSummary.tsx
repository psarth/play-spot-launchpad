import { MapPin, Calendar, Clock, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface BookingSummaryProps {
  venueName: string;
  venueLocation: string;
  sportName?: string;
  tableCourtName?: string;
  selectedDate: Date;
  slotLabel: string;
  pricePerHour: number;
  onConfirm: () => void;
  loading?: boolean;
}

export const BookingSummary = ({
  venueName,
  venueLocation,
  sportName,
  tableCourtName,
  selectedDate,
  slotLabel,
  pricePerHour,
  onConfirm,
  loading,
}: BookingSummaryProps) => {
  // Calculate fees (sample - adjust as needed)
  const basePrice = pricePerHour;
  const convenienceFee = Math.round(basePrice * 0.05); // 5% fee
  const totalAmount = basePrice + convenienceFee;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      {/* Venue Info */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
          <MapPin className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-sm">{venueName}</h3>
          <p className="text-xs text-muted-foreground line-clamp-1">{venueLocation}</p>
        </div>
      </div>

      {/* Booking Details */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {sportName && (
          <div>
            <span className="text-muted-foreground text-xs">Sport</span>
            <p className="font-medium">{sportName}</p>
          </div>
        )}
        {tableCourtName && (
          <div>
            <span className="text-muted-foreground text-xs">Table/Court</span>
            <p className="font-medium">{tableCourtName}</p>
          </div>
        )}
        <div>
          <span className="text-muted-foreground text-xs">Date</span>
          <p className="font-medium flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {format(selectedDate, "d MMM yyyy")}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Time</span>
          <p className="font-medium flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {slotLabel}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-dashed border-border" />

      {/* Price Breakdown */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Base price (1 hour)</span>
          <span>₹{basePrice}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Convenience fee</span>
          <span>₹{convenienceFee}</span>
        </div>
        <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
          <span>Total</span>
          <span className="text-primary">₹{totalAmount}</span>
        </div>
      </div>

      {/* CTA Button */}
      <Button 
        onClick={onConfirm} 
        disabled={loading}
        className="w-full h-12 text-base font-bold btn-press"
        size="lg"
      >
        <CreditCard className="mr-2 h-5 w-5" />
        {loading ? "Processing..." : `Pay ₹${totalAmount}`}
      </Button>

      <p className="text-[10px] text-center text-muted-foreground">
        By proceeding, you agree to our cancellation policy
      </p>
    </div>
  );
};

export default BookingSummary;
