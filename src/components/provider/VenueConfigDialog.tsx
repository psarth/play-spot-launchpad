import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dumbbell, CreditCard } from "lucide-react";
import VenueSportsConfig from "./VenueSportsConfig";
import VenuePaymentDetails from "./VenuePaymentDetails";

interface VenueConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueId: string;
  venueName: string;
  onUpdate?: () => void;
}

const VenueConfigDialog = ({ open, onOpenChange, venueId, venueName, onUpdate }: VenueConfigDialogProps) => {
  const [activeTab, setActiveTab] = useState("sports");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Configure Venue: {venueName}</DialogTitle>
          <DialogDescription>
            Set up sports, tables/courts, and payment details for this venue
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="sports" className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4" />
              Sports & Tables
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sports" className="mt-4">
            <VenueSportsConfig 
              venueId={venueId} 
              venueName={venueName} 
              onUpdate={onUpdate}
            />
          </TabsContent>

          <TabsContent value="payment" className="mt-4">
            <VenuePaymentDetails 
              venueId={venueId} 
              venueName={venueName}
              onClose={() => onOpenChange(false)}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default VenueConfigDialog;
