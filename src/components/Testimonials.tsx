import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Rahul Sharma",
    role: "Regular Player",
    content: "SportSpot made it so easy to find and book badminton courts near me. The facilities are always top-notch!",
    rating: 5,
  },
  {
    name: "Priya Patel",
    role: "Cricket Enthusiast",
    content: "Love the variety of venues available. Booking is seamless, and the cricket nets are professional quality.",
    rating: 5,
  },
  {
    name: "Amit Kumar",
    role: "Pool Player",
    content: "Best platform for booking sports venues! Clean facilities, great pricing, and excellent customer service.",
    rating: 5,
  },
];

const Testimonials = () => {
  return (
    <section id="testimonials" className="py-16 sm:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-12 sm:mb-16">
          <span className="inline-block text-sm font-semibold text-primary uppercase tracking-wider mb-3">Testimonials</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            What Our Players Say
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Join thousands of satisfied players who trust SportSpot
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {testimonials.map((testimonial, index) => (
            <Card
              key={testimonial.name}
              className="border-border hover:shadow-xl hover:border-primary/20 transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-6 sm:p-8">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 sm:w-5 sm:h-5 fill-primary text-primary"
                    />
                  ))}
                </div>
                <p className="text-muted-foreground mb-6 leading-relaxed text-sm sm:text-base">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-semibold">{testimonial.name.charAt(0)}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-sm sm:text-base">{testimonial.name}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">{testimonial.role}</div>
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

export default Testimonials;
