import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type BookingStatus = 
  | "pending" 
  | "confirmed" 
  | "cancelled"
  | "completed";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

const statusConfig: Record<string, {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  className: string;
  icon: typeof Clock;
}> = {
  pending: {
    label: "Pending Verification",
    variant: "outline",
    className: "border-warning bg-warning/10 text-warning hover:bg-warning/20",
    icon: AlertCircle,
  },
  confirmed: {
    label: "Confirmed",
    variant: "default",
    className: "border-success bg-success/10 text-success hover:bg-success/20",
    icon: CheckCircle,
  },
  completed: {
    label: "Completed",
    variant: "default",
    className: "border-success bg-success/10 text-success hover:bg-success/20",
    icon: CheckCircle,
  },
  cancelled: {
    label: "Cancelled",
    variant: "destructive",
    className: "border-destructive bg-destructive/10 text-destructive hover:bg-destructive/20",
    icon: XCircle,
  },
};

export const StatusBadge = ({ status, size = "md", showIcon = true }: StatusBadgeProps) => {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium gap-1.5 border",
        config.className,
        sizeClasses[size]
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
};

export const getStatusLabel = (status: string): string => {
  return statusConfig[status]?.label || status;
};