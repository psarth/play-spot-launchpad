import { Button } from "@/components/ui/button";
import { Menu, User, Calendar, LogOut, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        checkAuth();
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsAuthenticated(!!user);
    
    if (user) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      
      setUserRole(roleData?.role || null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const handleSwitchRole = () => {
    if (userRole === "provider") {
      navigate("/browse-venues");
    } else if (userRole === "customer") {
      navigate("/provider-dashboard");
    } else if (userRole === "admin") {
      navigate("/admin-dashboard");
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center space-x-2">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-bold text-foreground">
              SportSpot
            </span>
          </a>

          {/* Desktop Navigation */}
          {!isAuthenticated ? (
            <>
              <div className="hidden md:flex items-center space-x-8">
                <a href="#services" className="text-foreground hover:text-primary transition-colors">
                  Services
                </a>
                <a href="#about" className="text-foreground hover:text-primary transition-colors">
                  About
                </a>
                <a href="#testimonials" className="text-foreground hover:text-primary transition-colors">
                  Testimonials
                </a>
                <a href="#contact" className="text-foreground hover:text-primary transition-colors">
                  Contact
                </a>
              </div>

              <div className="hidden md:flex items-center gap-3">
                <Button variant="ghost" size="default" asChild>
                  <a href="/login">Log In</a>
                </Button>
                <Button variant="hero" size="default" asChild>
                  <a href="/signup">Sign Up</a>
                </Button>
              </div>
            </>
          ) : (
            <div className="hidden md:flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <a href="/my-bookings">
                  <Calendar className="w-4 h-4 mr-2" />
                  My Bookings
                </a>
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <User className="w-4 h-4 mr-2" />
                    Account
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate("/my-profile")}>
                    <User className="w-4 h-4 mr-2" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSwitchRole}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Switch to {userRole === "provider" ? "Customer" : "Provider"} View
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-foreground"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu size={24} />
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-4 border-t border-border">
            {!isAuthenticated ? (
              <>
                <a href="#services" className="block text-foreground hover:text-primary transition-colors">
                  Services
                </a>
                <a href="#about" className="block text-foreground hover:text-primary transition-colors">
                  About
                </a>
                <a href="#testimonials" className="block text-foreground hover:text-primary transition-colors">
                  Testimonials
                </a>
                <a href="#contact" className="block text-foreground hover:text-primary transition-colors">
                  Contact
                </a>
                <div className="flex flex-col gap-2 pt-2">
                  <Button variant="ghost" size="default" className="w-full" asChild>
                    <a href="/login">Log In</a>
                  </Button>
                  <Button variant="hero" size="default" className="w-full" asChild>
                    <a href="/signup">Sign Up</a>
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <a href="/my-bookings">
                    <Calendar className="w-4 h-4 mr-2" />
                    My Bookings
                  </a>
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => navigate("/my-profile")}>
                  <User className="w-4 h-4 mr-2" />
                  My Profile
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={handleSwitchRole}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Switch to {userRole === "provider" ? "Customer" : "Provider"} View
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
