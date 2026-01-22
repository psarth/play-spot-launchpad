import { Shield, Smartphone, MapPin, Target, Users, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const values = [
  {
    icon: Shield,
    title: "Verified Venues",
    description: "Every venue is personally verified by our team to ensure quality and safety standards.",
  },
  {
    icon: Smartphone,
    title: "UPI-First Payments",
    description: "Simple and secure payments via UPI. No complex payment gateways or hidden charges.",
  },
  {
    icon: MapPin,
    title: "India-Focused",
    description: "Built for Indian sports enthusiasts. From metros to tier-2 cities, we're expanding nationwide.",
  },
  {
    icon: CheckCircle,
    title: "Easy Booking",
    description: "Book your slot in under 2 minutes. Select venue, pick a time, pay, and play!",
  },
];

const stats = [
  { value: "500+", label: "Verified Venues" },
  { value: "50K+", label: "Happy Players" },
  { value: "20+", label: "Cities" },
  { value: "99%", label: "Satisfaction" },
];

const AboutUs = () => {
  return (
    <section id="about" className="py-16 sm:py-24 bg-secondary text-secondary-foreground overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16 animate-fade-in-up">
          <span className="inline-block text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            About Us
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-white">
            Simplifying Sports
            <span className="block text-gradient">Venue Booking</span>
          </h2>
          <p className="text-lg sm:text-xl text-secondary-foreground/80 max-w-3xl mx-auto leading-relaxed">
            We're on a mission to make booking sports venues as easy as ordering food online. 
            Whether you're a casual player or a serious athlete, SportSpot connects you with 
            verified facilities near you.
          </p>
        </div>

        {/* Mission Statement */}
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center mb-16 sm:mb-20">
          <div className="space-y-6 animate-fade-in-up delay-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-white">Our Mission</h3>
            </div>
            <p className="text-secondary-foreground/80 text-lg leading-relaxed">
              India has a passion for sports, but finding and booking venues has always been a hassle. 
              We're changing that. Our platform brings together venue owners and players, making the 
              entire process seamless, transparent, and trustworthy.
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg border border-primary/20">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm text-white font-medium">For Players</span>
              </div>
              <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg border border-primary/20">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm text-white font-medium">For Venue Owners</span>
              </div>
            </div>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 animate-fade-in-up delay-300">
            {stats.map((stat, index) => (
              <Card 
                key={stat.label} 
                className="bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-300 hover-lift"
              >
                <CardContent className="p-6 text-center">
                  <div className="text-3xl sm:text-4xl font-bold text-primary mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-secondary-foreground/70">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Core Values */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value, index) => (
            <Card 
              key={value.title}
              className="bg-white/5 border-white/10 hover:bg-white/10 hover:border-primary/30 transition-all duration-300 hover-lift animate-fade-in-up"
              style={{ animationDelay: `${(index + 4) * 100}ms` }}
            >
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
                  <value.icon className="h-6 w-6 text-primary" />
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">{value.title}</h4>
                <p className="text-sm text-secondary-foreground/70 leading-relaxed">
                  {value.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 pt-12 border-t border-white/10">
          <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-12">
            <div className="flex items-center gap-2 text-secondary-foreground/60">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">100% Verified Venues</span>
            </div>
            <div className="flex items-center gap-2 text-secondary-foreground/60">
              <Smartphone className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">UPI Payments Accepted</span>
            </div>
            <div className="flex items-center gap-2 text-secondary-foreground/60">
              <CheckCircle className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Secure & Trusted</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutUs;
