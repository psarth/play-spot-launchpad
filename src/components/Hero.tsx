import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-sports.jpg";

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Blur Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="People playing various sports in modern facility"
          className="w-full h-full object-cover blur-sm scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/98 via-background/95 to-background/92"></div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 relative z-10 pt-20">
        <div className="max-w-3xl">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight text-foreground">
            Book Your Perfect
            <span className="block bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mt-2">
              Sports Spot
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 leading-relaxed font-light">
            Discover and book premium sports facilities near you. From badminton courts to cricket
            nets, find your game in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              size="lg" 
              className="text-lg px-10 py-7 h-auto rounded-xl font-semibold shadow-[var(--shadow-glow)] hover:shadow-[0_15px_50px_-10px_hsl(24_95%_53%/0.5)] transition-all"
              onClick={() => navigate("/browse-venues")}
            >
              Book Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-10 py-7 h-auto rounded-xl font-semibold border-2 hover:bg-primary hover:text-primary-foreground hover:border-primary"
              onClick={() => navigate("/browse-venues")}
            >
              Explore Venues
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-8 mt-20">
            <div className="text-center sm:text-left">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                500+
              </div>
              <div className="text-sm text-muted-foreground mt-2 font-medium">Venues</div>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                50K+
              </div>
              <div className="text-sm text-muted-foreground mt-2 font-medium">Happy Players</div>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                15+
              </div>
              <div className="text-sm text-muted-foreground mt-2 font-medium">Sports</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
