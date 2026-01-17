import { Button } from "@/components/ui/button";
import { Menu, User, Calendar, LogOut, Home, Building2, Shield } from "lucide-react";
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
    navigate("/");
  };

  const getDashboardLink = () => {
    if (userRole === "admin") return "/admin-dashboard";
    if (userRole === "provider") return "/provider-dashboard";
    return "/customer-dashboard";
  };

  const getRoleIcon = () => {
    if (userRole === "admin") return <Shield className="w-4 h-4" />;
    if (userRole === "provider") return <Building2 className="w-4 h-4" />;
    return <User className="w-4 h-4" />;
  };

  const getRoleLabel = () => {
    if (userRole === "admin") return "Admin Dashboard";
    if (userRole === "provider") return "Provider Dashboard";
    return "My Dashboard";
  };

  // Only customers see Browse and My Bookings
  const isCustomer = userRole === "customer" || !userRole;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border shadow-sm">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="/" className="flex items-center space-x-2">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-md">
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
                <a href="/#services" className="text-foreground hover:text-primary transition-colors font-medium">
                  Sports
                </a>
                <a href="/browse-venues" className="text-foreground hover:text-primary transition-colors font-medium">
                  Browse Venues
                </a>
                <a href="/#testimonials" className="text-foreground hover:text-primary transition-colors font-medium">
                  Reviews
                </a>
              </div>

              <div className="hidden md:flex items-center gap-3">
                <Button variant="ghost" size="default" asChild>
                  <a href="/login">Log In</a>
                </Button>
                <Button size="default" asChild>
                  <a href="/signup">Sign Up</a>
                </Button>
              </div>
            </>
          ) : (
            <div className="hidden md:flex items-center gap-4">
              {/* Only show Browse for customers */}
              {isCustomer && (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <a href="/browse-venues">
                      <Home className="w-4 h-4 mr-2" />
                      Browse
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <a href="/my-bookings">
                      <Calendar className="w-4 h-4 mr-2" />
                      My Bookings
                    </a>
                  </Button>
                </>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    {getRoleIcon()}
                    <span className="hidden lg:inline">Account</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate(getDashboardLink())}>
                    {getRoleIcon()}
                    <span className="ml-2">{getRoleLabel()}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/my-profile")}>
                    <User className="w-4 h-4 mr-2" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-foreground p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu size={24} />
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-3 border-t border-border animate-fade-in">
            {!isAuthenticated ? (
              <>
                <a href="/#services" className="block py-2 text-foreground hover:text-primary transition-colors font-medium">
                  Sports
                </a>
                <a href="/browse-venues" className="block py-2 text-foreground hover:text-primary transition-colors font-medium">
                  Browse Venues
                </a>
                <a href="/#testimonials" className="block py-2 text-foreground hover:text-primary transition-colors font-medium">
                  Reviews
                </a>
                <div className="flex flex-col gap-2 pt-3 border-t border-border">
                  <Button variant="outline" size="default" className="w-full" asChild>
                    <a href="/login">Log In</a>
                  </Button>
                  <Button size="default" className="w-full" asChild>
                    <a href="/signup">Sign Up</a>
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                {/* Only show Browse & My Bookings for customers */}
                {isCustomer && (
                  <>
                    <Button variant="ghost" className="w-full justify-start" asChild>
                      <a href="/browse-venues">
                        <Home className="w-4 h-4 mr-2" />
                        Browse Venues
                      </a>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" asChild>
                      <a href="/my-bookings">
                        <Calendar className="w-4 h-4 mr-2" />
                        My Bookings
                      </a>
                    </Button>
                  </>
                )}
                <Button variant="ghost" className="w-full justify-start" onClick={() => navigate(getDashboardLink())}>
                  {getRoleIcon()}
                  <span className="ml-2">{getRoleLabel()}</span>
                </Button>
                <Button variant="ghost" className="w-full justify-start" onClick={() => navigate("/my-profile")}>
                  <User className="w-4 h-4 mr-2" />
                  My Profile
                </Button>
                <div className="border-t border-border pt-2 mt-2">
                  <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;