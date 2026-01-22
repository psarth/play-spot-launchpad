import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Building2, CreditCard, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BankDetails {
  id?: string;
  account_holder_name: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  upi_id: string;
  is_verified: boolean;
}

const ProviderBankDetails = () => {
  const [bankDetails, setBankDetails] = useState<BankDetails>({
    account_holder_name: "",
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    upi_id: "",
    is_verified: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBankDetails();
  }, []);

  const fetchBankDetails = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("provider_bank_details")
      .select("*")
      .eq("provider_id", user.id)
      .maybeSingle();

    if (data) {
      setBankDetails(data);
      setHasExisting(true);
    }
    setLoading(false);
  };

  const handleChange = (field: keyof BankDetails, value: string) => {
    setBankDetails((prev) => ({ ...prev, [field]: value }));
  };

  const validateIFSC = (ifsc: string): boolean => {
    // IFSC code format: 4 letters + 0 + 6 alphanumeric
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscRegex.test(ifsc.toUpperCase());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Please login to continue", variant: "destructive" });
      return;
    }

    // Validation
    if (!bankDetails.account_holder_name || !bankDetails.bank_name || 
        !bankDetails.account_number || !bankDetails.ifsc_code) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    if (!validateIFSC(bankDetails.ifsc_code)) {
      toast({ title: "Invalid IFSC code format", variant: "destructive" });
      return;
    }

    setSaving(true);

    try {
      if (hasExisting) {
        const { error } = await supabase
          .from("provider_bank_details")
          .update({
            account_holder_name: bankDetails.account_holder_name,
            bank_name: bankDetails.bank_name,
            account_number: bankDetails.account_number,
            ifsc_code: bankDetails.ifsc_code.toUpperCase(),
            upi_id: bankDetails.upi_id || null,
            is_verified: false, // Reset verification on update
          })
          .eq("provider_id", user.id);

        if (error) throw error;
        toast({ title: "Bank details updated successfully" });
      } else {
        const { error } = await supabase
          .from("provider_bank_details")
          .insert({
            provider_id: user.id,
            account_holder_name: bankDetails.account_holder_name,
            bank_name: bankDetails.bank_name,
            account_number: bankDetails.account_number,
            ifsc_code: bankDetails.ifsc_code.toUpperCase(),
            upi_id: bankDetails.upi_id || null,
          });

        if (error) throw error;
        setHasExisting(true);
        toast({ title: "Bank details saved successfully" });
      }
    } catch (error: any) {
      toast({ title: "Error saving bank details", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Bank Account Details</CardTitle>
              <CardDescription>
                Add your bank details to receive payouts for your bookings
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {bankDetails.is_verified && (
            <Alert className="mb-6 border-green-500/30 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                Your bank account is verified and ready to receive payouts
              </AlertDescription>
            </Alert>
          )}

          {hasExisting && !bankDetails.is_verified && (
            <Alert className="mb-6 border-warning/30 bg-warning/10">
              <AlertCircle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning">
                Your bank details are pending verification
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="account_holder_name">Account Holder Name *</Label>
                <Input
                  id="account_holder_name"
                  value={bankDetails.account_holder_name}
                  onChange={(e) => handleChange("account_holder_name", e.target.value)}
                  placeholder="As per bank records"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name *</Label>
                <Input
                  id="bank_name"
                  value={bankDetails.bank_name}
                  onChange={(e) => handleChange("bank_name", e.target.value)}
                  placeholder="e.g., State Bank of India"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_number">Account Number *</Label>
                <Input
                  id="account_number"
                  value={bankDetails.account_number}
                  onChange={(e) => handleChange("account_number", e.target.value)}
                  placeholder="Enter account number"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ifsc_code">IFSC Code *</Label>
                <Input
                  id="ifsc_code"
                  value={bankDetails.ifsc_code}
                  onChange={(e) => handleChange("ifsc_code", e.target.value.toUpperCase())}
                  placeholder="e.g., SBIN0001234"
                  maxLength={11}
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="upi_id">UPI ID (Optional)</Label>
                <Input
                  id="upi_id"
                  value={bankDetails.upi_id}
                  onChange={(e) => handleChange("upi_id", e.target.value)}
                  placeholder="yourname@upi"
                />
                <p className="text-xs text-muted-foreground">
                  This UPI ID will be shown to customers for payment
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={saving} className="btn-press">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    {hasExisting ? "Update Bank Details" : "Save Bank Details"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProviderBankDetails;
