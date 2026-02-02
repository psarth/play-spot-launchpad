import { Button } from "@/components/ui/button";
import { Menu, User, Calendar, LogOut, Home, Building2, Shield, Play, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
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

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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

  const isCustomer = userRole === "customer";

  const handleBookNow = () => {
    if (isAuthenticated) {
      navigate("/browse-venues");
    } else {
      navigate("/login");
    }
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled 
        ? "bg-card/95 backdrop-blur-lg border-b border-border shadow-sm" 
        : "bg-background/95 backdrop-blur-lg border-b border-border/50"
    }`}>
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo */}
          <a href="/" className="flex items-center space-x-2.5 group">
            <div className="w-9 h-9 bg-gradient-primary rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-all duration-300">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-lg font-bold text-foreground">
              SportSpot
            </span>
          </a>

          {/* Desktop Navigation */}
          {!isAuthenticated ? (
            <>
              <div className="hidden md:flex items-center space-x-8">
                <a href="/browse-venues" className="text-foreground hover:text-primary transition-colors font-medium">
                  Venues
                </a>
                <a href="/#about" className="text-foreground hover:text-primary transition-colors font-medium">
                  About
                </a>
              </div>

              <div className="hidden md:flex items-center gap-3">
                <Button variant="ghost" size="default" asChild>
                  <a href="/login">Log In</a>
                </Button>
                <Button 
                  size="default" 
                  className="btn-press shadow-sm" 
                  onClick={handleBookNow}
                >
                  Book Now
                </Button>
              </div>
            </>
          ) : (
            <div className="hidden md:flex items-center gap-4">
              {isCustomer && (
                <>
                  <Button variant="ghost" size="sm" asChild className={!scrolled ? "text-white hover:bg-white/10" : ""}>
                    <a href="/browse-venues">
                      <Home className="w-4 h-4 mr-2" />
                      Book Now
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" asChild className={!scrolled ? "text-white hover:bg-white/10" : ""}>
                    <a href="/my-bookings">
                      <Calendar className="w-4 h-4 mr-2" />
                      My Bookings
                    </a>
                  </Button>
                </>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`gap-2 ${!scrolled ? "border-white/20 text-white hover:bg-white/10" : ""}`}
                  >
                    {getRoleIcon()}
                    <span className="hidden lg:inline">Account</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-xl">
                  <DropdownMenuItem onClick={() => navigate(getDashboardLink())} className="rounded-lg">
                    {getRoleIcon()}
                    <span className="ml-2">{getRoleLabel()}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/my-profile")} className="rounded-lg">
                    <User className="w-4 h-4 mr-2" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive rounded-lg">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            className={`md:hidden p-2 rounded-lg transition-colors ${
              scrolled ? "text-foreground hover:bg-muted" : "text-white hover:bg-white/10"
            }`}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-3 border-t border-border/50 animate-fade-in bg-card rounded-b-2xl shadow-xl">
            {!isAuthenticated ? (
              <>
                <a href="/#services" className="block py-3 px-4 text-foreground hover:text-primary hover:bg-muted/50 rounded-xl transition-all font-medium">
                  Sports
                </a>
                <a href="/#about" className="block py-3 px-4 text-foreground hover:text-primary hover:bg-muted/50 rounded-xl transition-all font-medium">
                  About Us
                </a>
                <a href="/#testimonials" className="block py-3 px-4 text-foreground hover:text-primary hover:bg-muted/50 rounded-xl transition-all font-medium">
                  Reviews
                </a>
                <div className="flex flex-col gap-3 pt-4 px-4 border-t border-border">
                  <Button variant="outline" size="lg" className="w-full rounded-xl" asChild>
                    <a href="/login">Log In</a>
                  </Button>
                  <Button size="lg" className="w-full rounded-xl bg-gradient-primary" onClick={handleBookNow}>
                    <Play className="w-4 h-4 mr-1.5 fill-current" />
                    Book Now
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2 px-4">
                {isCustomer && (
                  <>
                    <Button variant="ghost" className="w-full justify-start rounded-xl h-12" asChild>
                      <a href="/browse-venues">
                        <Play className="w-4 h-4 mr-3 fill-current" />
                        Book Now
                      </a>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start rounded-xl h-12" asChild>
                      <a href="/my-bookings">
                        <Calendar className="w-4 h-4 mr-3" />
                        My Bookings
                      </a>
                    </Button>
                  </>
                )}
                <Button variant="ghost" className="w-full justify-start rounded-xl h-12" onClick={() => navigate(getDashboardLink())}>
                  {getRoleIcon()}
                  <span className="ml-3">{getRoleLabel()}</span>
                </Button>
                <Button variant="ghost" className="w-full justify-start rounded-xl h-12" onClick={() => navigate("/my-profile")}>
                  <User className="w-4 h-4 mr-3" />
                  My Profile
                </Button>
                <div className="border-t border-border pt-3 mt-2">
                  <Button variant="ghost" className="w-full justify-start rounded-xl h-12 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-3" />
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
