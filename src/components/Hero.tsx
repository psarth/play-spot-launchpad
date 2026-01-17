import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Smartphone, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-sports.jpg";

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="People playing various sports in modern facility"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,40%,12%)]/95 via-[hsl(220,35%,18%)]/85 to-primary/40"></div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 relative z-10 pt-20 pb-12">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 rounded-full px-4 py-2 mb-6">
            <span className="w-2 h-2 bg-primary-foreground rounded-full animate-pulse"></span>
            <span className="text-primary-foreground/90 text-sm font-medium">🇮🇳 India's Trusted Sports Booking Platform</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight text-primary-foreground">
            Book Your Perfect
            <span className="block mt-2">
              Sports Venue
            </span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-primary-foreground/80 mb-8 leading-relaxed max-w-2xl">
            Discover and book verified sports facilities near you. From badminton courts to cricket
            nets, find your game in minutes.
          </p>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <div className="flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm px-3 py-2 rounded-lg border border-primary-foreground/20">
              <Smartphone className="h-4 w-4 text-primary-foreground" />
              <span className="text-sm text-primary-foreground font-medium">UPI Accepted</span>
            </div>
            <div className="flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm px-3 py-2 rounded-lg border border-primary-foreground/20">
              <Shield className="h-4 w-4 text-primary-foreground" />
              <span className="text-sm text-primary-foreground font-medium">Verified Venues</span>
            </div>
            <div className="flex items-center gap-2 bg-primary-foreground/10 backdrop-blur-sm px-3 py-2 rounded-lg border border-primary-foreground/20">
              <MapPin className="h-4 w-4 text-primary-foreground" />
              <span className="text-sm text-primary-foreground font-medium">Pan India</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              size="lg" 
              className="text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-7 h-auto rounded-xl bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-xl font-semibold"
              onClick={() => navigate("/browse-venues")}
            >
              Browse Venues
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-base sm:text-lg px-8 sm:px-10 py-6 sm:py-7 h-auto rounded-xl border-2 border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => navigate("/signup")}
            >
              List Your Venue
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 sm:gap-8 mt-12 sm:mt-16 pt-8 sm:pt-12 border-t border-primary-foreground/20">
            <div className="text-center sm:text-left">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground">
                500+
              </div>
              <div className="text-xs sm:text-sm text-primary-foreground/70 mt-1 sm:mt-2 font-medium">Verified Venues</div>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground">
                50K+
              </div>
              <div className="text-xs sm:text-sm text-primary-foreground/70 mt-1 sm:mt-2 font-medium">Happy Players</div>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary-foreground">
                20+
              </div>
              <div className="text-xs sm:text-sm text-primary-foreground/70 mt-1 sm:mt-2 font-medium">Cities</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;