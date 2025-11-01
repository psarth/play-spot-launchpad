import { Card, CardContent } from "@/components/ui/card";
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
  return (
    <section id="services" className="py-24 bg-gradient-to-b from-background to-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Popular Sports
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Book premium facilities for your favorite sports, anytime, anywhere
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {sports.map((sport, index) => (
            <Card
              key={sport.title}
              className="group overflow-hidden border-border hover:shadow-[var(--shadow-glow)] transition-all duration-300 cursor-pointer animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-0">
                <div className="relative h-72 overflow-hidden">
                  <img
                    src={sport.image}
                    alt={sport.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent opacity-95"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">{sport.title}</h3>
                    <p className="text-sm text-muted-foreground">{sport.description}</p>
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
