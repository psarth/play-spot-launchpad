import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, QrCode, Loader2, Check, Smartphone } from "lucide-react";

interface VenuePaymentDetailsProps {
  venueId: string;
  venueName: string;
  onClose?: () => void;
}

interface PaymentDetails {
  id?: string;
  upi_id: string;
  qr_code_url: string | null;
}

const VenuePaymentDetails = ({ venueId, venueName, onClose }: VenuePaymentDetailsProps) => {
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>({
    upi_id: "",
    qr_code_url: null,
  });
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPaymentDetails();
  }, [venueId]);

  const fetchPaymentDetails = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("venue_payment_details")
      .select("*")
      .eq("venue_id", venueId)
      .maybeSingle();

    if (data) {
      setPaymentDetails({
        id: data.id,
        upi_id: data.upi_id,
        qr_code_url: data.qr_code_url,
      });
      if (data.qr_code_url) {
        setQrPreview(data.qr_code_url);
      }
    }
    setLoading(false);
  };

  const validateUpiId = (upi: string): boolean => {
    // UPI ID format: username@provider
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z]{2,}$/;
    return upiRegex.test(upi);
  };

  const handleQrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({ title: "Please upload a valid image (JPEG, PNG, WebP)", variant: "destructive" });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image must be less than 2MB", variant: "destructive" });
      return;
    }

    setQrFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setQrPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadQrCode = async (): Promise<string | null> => {
    if (!qrFile) return paymentDetails.qr_code_url;

    const fileExt = qrFile.name.split(".").pop();
    const fileName = `${venueId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("payment-qr-codes")
      .upload(fileName, qrFile);

    if (uploadError) {
      console.error("QR upload error:", uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("payment-qr-codes")
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSave = async () => {
    if (!paymentDetails.upi_id.trim()) {
      toast({ title: "UPI ID is required", variant: "destructive" });
      return;
    }

    if (!validateUpiId(paymentDetails.upi_id.trim())) {
      toast({ title: "Invalid UPI ID format (e.g., name@upi)", variant: "destructive" });
      return;
    }

    setSaving(true);

    try {
      const qrUrl = await uploadQrCode();

      const paymentData = {
        venue_id: venueId,
        upi_id: paymentDetails.upi_id.trim(),
        qr_code_url: qrUrl,
        is_active: true,
      };

      if (paymentDetails.id) {
        // Update existing
        const { error } = await supabase
          .from("venue_payment_details")
          .update(paymentData)
          .eq("id", paymentDetails.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("venue_payment_details")
          .insert(paymentData);

        if (error) throw error;
      }

      toast({ title: "Payment details saved successfully!" });
      onClose?.();
    } catch (error: any) {
      toast({ title: "Error saving payment details", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Payment Details for {venueName}
        </CardTitle>
        <CardDescription>
          Add UPI ID and QR code for customers to pay directly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="upi_id">UPI ID *</Label>
          <Input
            id="upi_id"
            value={paymentDetails.upi_id}
            onChange={(e) => setPaymentDetails({ ...paymentDetails, upi_id: e.target.value })}
            placeholder="e.g., yourname@upi or yourname@paytm"
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Format: username@provider (e.g., john@upi, john@paytm, john@ybl)
          </p>
        </div>

        <div>
          <Label>QR Code Image</Label>
          <div className="mt-2 border-2 border-dashed border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleQrChange}
              className="hidden"
              id="qr-image"
            />
            
            {qrPreview ? (
              <div className="relative inline-block">
                <img
                  src={qrPreview}
                  alt="QR Code Preview"
                  className="w-48 h-48 object-contain rounded-lg border mx-auto"
                />
                <button
                  type="button"
                  onClick={() => {
                    setQrPreview(null);
                    setQrFile(null);
                    setPaymentDetails({ ...paymentDetails, qr_code_url: null });
                  }}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label htmlFor="qr-image" className="cursor-pointer block text-center">
                <QrCode className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to upload QR code image
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPEG, PNG, WebP (Max 2MB)
                </p>
              </label>
            )}
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4 border-t">
          {onClose && (
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Save Payment Details
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default VenuePaymentDetails;
