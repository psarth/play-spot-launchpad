import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import poolImage from "@/assets/pool.jpg";
import badmintonImage from "@/assets/badminton.jpg";
import cricketImage from "@/assets/cricket.jpg";
import snookerImage from "@/assets/snooker.jpg";

const sports = [
  {
    title: "Pool & Billiards",
    image: poolImage,
    description: "Premium pool tables in upscale venues",
  },
  {
    title: "Badminton",
    image: badmintonImage,
    description: "Professional-grade courts with quality equipment",
  },
  {
    title: "Cricket Nets",
    image: cricketImage,
    description: "Modern indoor practice facilities",
  },
  {
    title: "Snooker",
    image: snookerImage,
    description: "Full-size tables in sophisticated settings",
  },
];

const Services = () => {
  const navigate = useNavigate();

  return (
    <section id="services" className="py-16 sm:py-24 bg-muted/50">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-12 sm:mb-16 animate-fade-in">
          <span className="inline-block text-sm font-semibold text-primary uppercase tracking-wider mb-3">Our Sports</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Popular Sports
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Book verified venues for your favorite sports, anytime, anywhere in India
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {sports.map((sport, index) => (
            <Card
              key={sport.title}
              onClick={() => navigate("/browse-venues")}
              className="group overflow-hidden border-border hover:shadow-xl hover:border-primary/20 transition-all duration-300 cursor-pointer animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-0">
                <div className="relative h-48 sm:h-64 lg:h-72 overflow-hidden">
                  <img
                    src={sport.image}
                    alt={sport.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/40 to-transparent"></div>
                  <div className="absolute top-3 right-3">
                    <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm text-xs">
                      Verified
                    </Badge>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                    <h3 className="text-lg sm:text-2xl font-bold mb-1 sm:mb-2 text-primary-foreground group-hover:text-primary-foreground transition-colors">{sport.title}</h3>
                    <p className="text-xs sm:text-sm text-primary-foreground/80 hidden sm:block">{sport.description}</p>
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