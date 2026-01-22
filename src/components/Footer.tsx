import { Facebook, Instagram, Twitter, Mail, Phone, MapPin, Shield, Smartphone, CheckCircle } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-secondary border-t border-secondary/20">
      <div className="container mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-4 sm:col-span-2 md:col-span-1">
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">S</span>
              </div>
              <span className="text-xl font-bold text-secondary-foreground">
                SportSpot
              </span>
            </div>
            <p className="text-sm text-secondary-foreground/70">
              India's trusted platform for booking verified sports facilities across cities.
            </p>
            {/* Trust Badges */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-xs text-secondary-foreground/80 bg-white/10 px-2 py-1 rounded">
                <Smartphone className="w-3 h-3 text-primary" />
                UPI Payments
              </div>
              <div className="flex items-center gap-1.5 text-xs text-secondary-foreground/80 bg-white/10 px-2 py-1 rounded">
                <Shield className="w-3 h-3 text-primary" />
                Verified
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4 text-secondary-foreground">Quick Links</h3>
            <ul className="space-y-2 text-sm text-secondary-foreground/70">
              <li>
                <a href="/browse-venues" className="hover:text-primary transition-colors">
                  Book Now
                </a>
              </li>
              <li>
                <a href="/#services" className="hover:text-primary transition-colors">
                  Sports
                </a>
              </li>
              <li>
                <a href="/#about" className="hover:text-primary transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="/#testimonials" className="hover:text-primary transition-colors">
                  Reviews
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4 text-secondary-foreground">Contact Us</h3>
            <ul className="space-y-3 text-sm text-secondary-foreground/70">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                <span>hello@sportspot.in</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                <span>+91 98765 43210</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span>Mumbai, India</span>
              </li>
            </ul>
          </div>

          {/* Social & Policies */}
          <div>
            <h3 className="font-semibold mb-4 text-secondary-foreground">Follow Us</h3>
            <div className="flex gap-3 mb-6">
              <a
                href="#"
                className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-primary text-secondary-foreground hover:text-primary-foreground transition-all duration-300"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-primary text-secondary-foreground hover:text-primary-foreground transition-all duration-300"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-primary text-secondary-foreground hover:text-primary-foreground transition-all duration-300"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
            
            {/* Cancellation Policy */}
            <div className="text-xs text-secondary-foreground/60 space-y-1">
              <p className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-primary" />
                Free cancellation up to 24hrs before
              </p>
              <p className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-primary" />
                Refunds processed in 3-5 business days
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 text-center text-sm text-secondary-foreground/60">
          <p>&copy; {new Date().getFullYear()} SportSpot. Made with ❤️ in India. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
