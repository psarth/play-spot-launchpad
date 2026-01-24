import { Card, CardContent } from "@/components/ui/card";
import { Star, Shield, CheckCircle } from "lucide-react";

const testimonials = [
  {
    name: "Rahul Sharma",
    role: "Badminton Player, Mumbai",
    content: "SportSpot made it so easy to find and book badminton courts near me. The UPI payment is super convenient!",
    rating: 5,
  },
  {
    name: "Priya Patel",
    role: "Cricket Enthusiast, Delhi",
    content: "Love the verified venues! Booking is seamless, and the cricket nets are always professional quality.",
    rating: 5,
  },
  {
    name: "Amit Kumar",
    role: "Pool Player, Bangalore",
    content: "Best platform for booking sports venues! Clean facilities, great pricing, and excellent support.",
    rating: 5,
  },
];

const Testimonials = () => {
  return (
    <section id="testimonials" className="py-16 sm:py-24 bg-secondary">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-12 sm:mb-16">
          <span className="inline-block text-sm font-semibold text-accent uppercase tracking-wider mb-3 animate-fade-in-up">
            Testimonials
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-secondary-foreground animate-fade-in-up delay-100">
            Trusted by Players
          </h2>
          <p className="text-lg sm:text-xl text-secondary-foreground/70 max-w-2xl mx-auto animate-fade-in-up delay-200">
            Join thousands of satisfied players across India
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {testimonials.map((testimonial, index) => (
            <Card
              key={testimonial.name}
              className="border-white/10 bg-secondary-foreground/5 backdrop-blur-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300 hover-lift animate-fade-in-up"
              style={{ animationDelay: `${(index + 3) * 100}ms` }}
            >
              <CardContent className="p-6 sm:p-8">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 sm:w-5 sm:h-5 fill-warning text-warning"
                    />
                  ))}
                </div>
                <p className="text-secondary-foreground/80 mb-6 leading-relaxed text-sm sm:text-base">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-primary font-semibold">{testimonial.name.charAt(0)}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-sm sm:text-base flex items-center gap-1.5 text-secondary-foreground">
                        {testimonial.name}
                        <CheckCircle className="h-4 w-4 text-accent" />
                      </div>
                      <div className="text-xs sm:text-sm text-secondary-foreground/60">{testimonial.role}</div>
                    </div>
                  </div>
                  <Shield className="h-5 w-5 text-primary/50" />
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
