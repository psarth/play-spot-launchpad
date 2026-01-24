import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Shield, ArrowRight } from "lucide-react";
import poolImage from "@/assets/pool.jpg";
import badmintonImage from "@/assets/badminton.jpg";
import cricketImage from "@/assets/cricket.jpg";
import snookerImage from "@/assets/snooker.jpg";

const sports = [
  {
    title: "Pool & Billiards",
    image: poolImage,
    description: "Premium pool tables in upscale venues",
    count: "120+ Tables",
  },
  {
    title: "Badminton",
    image: badmintonImage,
    description: "Professional-grade courts with quality equipment",
    count: "200+ Courts",
  },
  {
    title: "Cricket Nets",
    image: cricketImage,
    description: "Modern indoor practice facilities",
    count: "80+ Nets",
  },
  {
    title: "Snooker",
    image: snookerImage,
    description: "Full-size tables in sophisticated settings",
    count: "60+ Tables",
  },
];

const Services = () => {
  const navigate = useNavigate();

  return (
    <section id="services" className="py-20 sm:py-28 bg-secondary relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-block text-sm font-semibold text-accent uppercase tracking-wider mb-4 animate-fade-in-up">
            Our Sports
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-5 text-secondary-foreground animate-fade-in-up delay-100">
            Popular <span className="text-gradient">Sports</span>
          </h2>
          <p className="text-lg sm:text-xl text-secondary-foreground/70 max-w-2xl mx-auto animate-fade-in-up delay-200">
            Book verified venues for your favorite sports, anytime, anywhere in India
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {sports.map((sport, index) => (
            <Card
              key={sport.title}
              onClick={() => navigate("/browse-venues")}
              className="group overflow-hidden border-0 bg-card shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer hover-lift animate-fade-in-up rounded-2xl"
              style={{ animationDelay: `${(index + 3) * 100}ms` }}
            >
              <CardContent className="p-0">
                <div className="relative h-64 sm:h-72 lg:h-80 overflow-hidden">
                  <img
                    src={sport.image}
                    alt={sport.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                  />
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/60 to-transparent opacity-90"></div>
                  
                  {/* Verified Badge */}
                  <div className="absolute top-4 right-4">
                    <Badge className="verified-badge gap-1.5">
                      <Shield className="h-3 w-3" />
                      Verified
                    </Badge>
                  </div>

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-accent">{sport.count}</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold mb-2 text-white group-hover:text-accent transition-colors duration-300">
                      {sport.title}
                    </h3>
                    <p className="text-sm text-white/70 mb-4 line-clamp-2">
                      {sport.description}
                    </p>
                    <div className="flex items-center gap-2 text-primary font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                      <span>Book Now</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
