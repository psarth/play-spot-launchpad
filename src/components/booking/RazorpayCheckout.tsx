import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CreditCard, Smartphone, Shield, CheckCircle, Loader2 } from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayCheckoutProps {
  bookingId: string;
  venueId: string;
  amount: number;
  venueName: string;
  slotLabel: string;
  sportName?: string;
  tableCourtName?: string;
  bookingDate: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const RazorpayCheckout = ({
  bookingId,
  venueId,
  amount,
  venueName,
  slotLabel,
  sportName,
  tableCourtName,
  bookingDate,
  onSuccess,
  onCancel,
}: RazorpayCheckoutProps) => {
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Create order on mount
  useEffect(() => {
    createOrder();
  }, []);

  const createOrder = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please login to continue");
        return;
      }

      const response = await supabase.functions.invoke("create-razorpay-order", {
        body: {
          amount,
          bookingId,
          venueId,
          customerEmail: session.user.email,
          customerPhone: session.user.phone,
          description: `Booking at ${venueName}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setOrderData(response.data);
    } catch (error: any) {
      console.error("Error creating order:", error);
      toast.error("Failed to create payment order");
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!orderData || !scriptLoaded) {
      toast.error("Payment system is loading. Please wait.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please login to continue");
      return;
    }

    const options = {
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "SportSpot",
      description: `Booking at ${venueName}`,
      order_id: orderData.orderId,
      handler: async (response: any) => {
        // Verify payment
        setLoading(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          const verifyResponse = await supabase.functions.invoke("verify-razorpay-payment", {
            body: {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingId,
            },
          });

          if (verifyResponse.error) {
            throw new Error(verifyResponse.error.message);
          }

          toast.success("Payment successful! 🎉");
          onSuccess();
        } catch (error: any) {
          console.error("Payment verification failed:", error);
          toast.error("Payment verification failed. Please contact support.");
        } finally {
          setLoading(false);
        }
      },
      prefill: {
        email: user.email,
        contact: user.phone || "",
      },
      theme: {
        color: "#16a34a", // Primary green
      },
      modal: {
        ondismiss: () => {
          toast.info("Payment cancelled");
        },
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  };

  const convenienceFee = orderData?.convenienceFee || Math.round(amount * 0.02);
  const totalAmount = orderData?.totalAmount || (amount + convenienceFee);

  return (
    <Card className="animate-scale-in">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Complete Payment</CardTitle>
            <p className="text-sm text-muted-foreground">Secure payment via Razorpay</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Booking Summary */}
        <div className="bg-muted/50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Venue</span>
            <span className="font-medium">{venueName}</span>
          </div>
          {sportName && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sport</span>
              <span className="font-medium">{sportName}</span>
            </div>
          )}
          {tableCourtName && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Table/Court</span>
              <span className="font-medium">{tableCourtName}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Date</span>
            <span className="font-medium">{new Date(bookingDate).toLocaleDateString("en-IN")}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Time</span>
            <span className="font-medium">{slotLabel}</span>
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Base Price</span>
            <span>₹{amount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Convenience Fee</span>
            <span>₹{convenienceFee}</span>
          </div>
          <div className="flex justify-between font-semibold text-lg pt-2 border-t">
            <span>Total</span>
            <span className="text-primary">₹{totalAmount}</span>
          </div>
        </div>

        {/* Test Mode Badge */}
        {orderData?.testMode && (
          <Badge variant="outline" className="w-full justify-center bg-warning/10 text-warning border-warning/30">
            🧪 Test Mode - No real payment will be processed
          </Badge>
        )}

        {/* Trust Signals */}
        <div className="flex items-center justify-center gap-4 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3 text-success" />
            <span>Secure</span>
          </div>
          <div className="flex items-center gap-1">
            <Smartphone className="h-3 w-3 text-primary" />
            <span>UPI Enabled</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-success" />
            <span>Instant Confirm</span>
          </div>
        </div>

        {/* Payment Button */}
        <Button
          onClick={handlePayment}
          disabled={loading || !orderData || !scriptLoaded}
          className="w-full h-12 text-base font-semibold btn-press"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Pay ₹{totalAmount}
            </>
          )}
        </Button>

        {/* Cancel Button */}
        <Button
          variant="ghost"
          onClick={onCancel}
          className="w-full"
          disabled={loading}
        >
          Cancel
        </Button>
      </CardContent>
    </Card>
  );
};

export default RazorpayCheckout;
