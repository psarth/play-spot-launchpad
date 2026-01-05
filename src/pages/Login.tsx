import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, User, Building2, Copy, Check, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { loginSchema, type LoginFormData } from "@/lib/validations";

const sampleCredentials = {
  customer: {
    email: "customer@sportspot.com",
    password: "Customer@123",
    label: "Customer",
    icon: User,
  },
  provider: {
    email: "provider@sportspot.com",
    password: "Provider@123",
    label: "Provider",
    icon: Building2,
  },
  admin: {
    email: "admin@sportspot.com",
    password: "Admin@123",
    label: "Admin",
    icon: Shield,
  },
};

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [settingUpDemo, setSettingUpDemo] = useState(false);

  const handleChange = (field: keyof LoginFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleCopyCredentials = (type: "customer" | "provider" | "admin") => {
    const creds = sampleCredentials[type];
    setFormData({ email: creds.email, password: creds.password });
    setCopiedField(type);
    toast.success(`${creds.label} credentials filled`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const setupDemoUsers = async () => {
    setSettingUpDemo(true);
    try {
      const response = await supabase.functions.invoke("seed-demo-users");
      if (response.error) {
        toast.error("Failed to setup demo users: " + response.error.message);
      } else {
        toast.success("Demo users created successfully! You can now login.");
      }
    } catch (error) {
      toast.error("Failed to setup demo users");
    } finally {
      setSettingUpDemo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const validation = loginSchema.safeParse(formData);
    if (!validation.success) {
      const fieldErrors: Partial<Record<keyof LoginFormData, string>> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as keyof LoginFormData] = err.message;
        }
      });
      setErrors(fieldErrors);
      setLoading(false);
      return;
    }

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password. Please try again.");
        } else {
          toast.error(error.message);
        }
      } else if (authData.user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", authData.user.id)
          .single();

        toast.success("Welcome back!");

        if (roleData?.role === "admin") {
          navigate("/admin-dashboard");
        } else if (roleData?.role === "provider") {
          navigate("/provider-dashboard");
        } else {
          navigate("/customer-dashboard");
        }
      }
    } catch (error) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <div className="w-full max-w-md animate-fade-in">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <Card className="border-border shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">S</span>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center">
              Log in to your SportSpot account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Sample Credentials Section */}
            <div className="mb-6 p-4 bg-muted rounded-xl border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-3 text-center">
                Demo Credentials - Click to auto-fill
              </p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {(["customer", "provider", "admin"] as const).map((type) => {
                  const creds = sampleCredentials[type];
                  const Icon = creds.icon;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleCopyCredentials(type)}
                      className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-center group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{creds.label}</p>
                      </div>
                      {copiedField === type && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                    </button>
                  );
                })}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={setupDemoUsers}
                disabled={settingUpDemo}
              >
                {settingUpDemo ? "Setting up..." : "Setup Demo Users (First time only)"}
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  className={errors.password ? "border-destructive" : ""}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="default"
                size="lg"
                className="w-full"
                disabled={loading}
              >
                {loading ? "Logging in..." : "Log In"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/signup" className="text-primary hover:underline font-medium">
                  Sign up
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
