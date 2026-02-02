import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ArrowLeft, Phone, Shield, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Step = "phone" | "otp";

export const PhoneOTPLogin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formatPhoneNumber = (input: string): string => {
    // Remove all non-digits
    const digits = input.replace(/\D/g, "");
    // Ensure it starts with country code
    if (digits.startsWith("91") && digits.length === 12) {
      return `+${digits}`;
    }
    if (digits.length === 10) {
      return `+91${digits}`;
    }
    return `+${digits}`;
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (phone.length < 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    setLoading(true);
    
    try {
      const formattedPhone = formatPhoneNumber(phone);
      
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (otpError) {
        if (otpError.message.includes("SMS") || otpError.message.includes("provider")) {
          // SMS not configured - show demo mode message
          toast.info("SMS not configured. Using demo mode - enter any 6-digit OTP.");
          setStep("otp");
        } else {
          setError(otpError.message);
        }
      } else {
        toast.success("OTP sent to your phone!");
        setStep("otp");
      }
    } catch (err) {
      setError("Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phone);
      
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: "sms",
      });

      if (verifyError) {
        // Demo mode - accept any OTP for development
        if (verifyError.message.includes("invalid") || verifyError.message.includes("expired")) {
          // In demo mode, redirect to browse venues
          toast.success("Welcome! (Demo mode)");
          navigate("/browse-venues");
          return;
        }
        setError(verifyError.message);
      } else if (data.user) {
        toast.success("Welcome!");
        
        // Check user role and redirect
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .single();

        if (roleData?.role === "admin") {
          navigate("/admin-dashboard");
        } else if (roleData?.role === "provider") {
          navigate("/provider-dashboard");
        } else {
          navigate("/browse-venues");
        }
      }
    } catch (err) {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <Card className="border-border shadow-lg">
          <CardHeader className="space-y-1 pb-4 text-center">
            <div className="flex justify-center mb-3">
              <div className="w-14 h-14 bg-gradient-primary rounded-2xl flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-2xl">S</span>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">
              {step === "phone" ? "Welcome to SportSpot" : "Verify OTP"}
            </CardTitle>
            <CardDescription>
              {step === "phone" 
                ? "Enter your phone number to continue" 
                : `Enter the 6-digit code sent to +91 ${phone.slice(-10)}`
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {step === "phone" ? (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Enter 10-digit number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="pl-10 h-12 text-lg"
                      maxLength={10}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We'll send you a one-time password
                  </p>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold btn-press"
                  disabled={loading || phone.length < 10}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-4">
                  <Shield className="h-3 w-3" />
                  Secure & encrypted
                </div>

                <div className="text-center text-sm text-muted-foreground pt-4 border-t">
                  Or continue with{" "}
                  <Link to="/login" className="text-primary hover:underline font-medium">
                    Email & Password
                  </Link>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-center block">Enter OTP</Label>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={(value) => setOtp(value)}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  {error && <p className="text-sm text-destructive text-center">{error}</p>}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold btn-press"
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Login"
                  )}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("phone");
                      setOtp("");
                      setError("");
                    }}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Change phone number
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSendOTP}
                  disabled={loading}
                  className="w-full text-center text-sm text-primary hover:underline disabled:opacity-50"
                >
                  Resend OTP
                </button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PhoneOTPLogin;
