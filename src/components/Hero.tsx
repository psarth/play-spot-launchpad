import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Smartphone, MapPin, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-sports.jpg";

const Hero = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleBookNow = () => {
    if (isAuthenticated) {
      navigate("/browse-venues");
    } else {
      navigate("/login");
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="People playing various sports in modern facility"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-hero opacity-95"></div>
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-40 left-20 w-48 h-48 bg-accent/10 rounded-full blur-3xl animate-float delay-500"></div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 relative z-10 pt-20 pb-12">
        <div className="max-w-3xl">
          {/* Badge */}
          <div 
            className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-6 animate-fade-in-up"
          >
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
            <span className="text-white/90 text-sm font-medium">🇮🇳 India's Trusted Sports Booking Platform</span>
          </div>
          
          {/* Heading */}
          <h1 
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight text-white animate-fade-in-up delay-100"
          >
            Book Your Perfect
            <span className="block mt-2 text-gradient">
              Sports Venue
            </span>
          </h1>
          
          {/* Subheading */}
          <p 
            className="text-lg sm:text-xl md:text-2xl text-white/80 mb-8 leading-relaxed max-w-2xl animate-fade-in-up delay-200"
          >
            Discover and book verified sports facilities near you. From badminton courts to cricket
            nets, find your game in minutes.
          </p>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center gap-3 mb-8 animate-fade-in-up delay-300">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/20">
              <Smartphone className="h-4 w-4 text-primary" />
              <span className="text-sm text-white font-medium">UPI Accepted</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/20">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm text-white font-medium">Verified Venues</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-lg border border-white/20">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-sm text-white font-medium">Pan India</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up delay-400">
            <Button 
              size="lg" 
              className="text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-7 h-auto rounded-xl bg-primary hover:bg-primary-deep text-white shadow-xl font-bold btn-press animate-pulse-gentle"
              onClick={handleBookNow}
            >
              <Play className="mr-2 h-5 w-5 fill-current" />
              BOOK NOW
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-7 h-auto rounded-xl border-2 border-white/30 bg-transparent text-white hover:bg-white/10 btn-press"
              onClick={() => navigate("/#about")}
            >
              Learn More
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 sm:gap-8 mt-12 sm:mt-16 pt-8 sm:pt-12 border-t border-white/20 animate-fade-in-up delay-500">
            <div className="text-center sm:text-left">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
                500+
              </div>
              <div className="text-xs sm:text-sm text-white/70 mt-1 sm:mt-2 font-medium">Verified Venues</div>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
                50K+
              </div>
              <div className="text-xs sm:text-sm text-white/70 mt-1 sm:mt-2 font-medium">Happy Players</div>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
                20+
              </div>
              <div className="text-xs sm:text-sm text-white/70 mt-1 sm:mt-2 font-medium">Cities</div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky CTA */}
      <div className="sticky-cta">
        <Button 
          onClick={handleBookNow}
          className="w-full h-14 text-lg font-bold rounded-xl bg-primary hover:bg-primary-deep"
        >
          <Play className="mr-2 h-5 w-5 fill-current" />
          BOOK NOW
        </Button>
      </div>
    </section>
  );
};

export default Hero;
