import { Facebook, Instagram, Twitter, Mail, Phone, MapPin, Shield, Smartphone } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-primary-deep border-t border-primary/20">
      <div className="container mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-4 sm:col-span-2 md:col-span-1">
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 bg-primary-foreground rounded-xl flex items-center justify-center">
                <span className="text-primary font-bold text-lg">S</span>
              </div>
              <span className="text-xl font-bold text-primary-foreground">
                SportSpot
              </span>
            </div>
            <p className="text-sm text-primary-foreground/70">
              India's trusted platform for booking verified sports facilities across cities.
            </p>
            {/* Trust Badges */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-xs text-primary-foreground/80 bg-primary-foreground/10 px-2 py-1 rounded">
                <Smartphone className="w-3 h-3" />
                UPI Payments
              </div>
              <div className="flex items-center gap-1.5 text-xs text-primary-foreground/80 bg-primary-foreground/10 px-2 py-1 rounded">
                <Shield className="w-3 h-3" />
                Verified
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4 text-primary-foreground">Quick Links</h3>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li>
                <a href="/browse-venues" className="hover:text-primary-foreground transition-colors">
                  Browse Venues
                </a>
              </li>
              <li>
                <a href="/#services" className="hover:text-primary-foreground transition-colors">
                  Sports
                </a>
              </li>
              <li>
                <a href="/#testimonials" className="hover:text-primary-foreground transition-colors">
                  Reviews
                </a>
              </li>
              <li>
                <a href="/signup" className="hover:text-primary-foreground transition-colors">
                  List Your Venue
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4 text-primary-foreground">Contact Us</h3>
            <ul className="space-y-3 text-sm text-primary-foreground/70">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary-foreground" />
                <span>hello@sportspot.in</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary-foreground" />
                <span>+91 98765 43210</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary-foreground" />
                <span>Mumbai, India</span>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="font-semibold mb-4 text-primary-foreground">Follow Us</h3>
            <div className="flex gap-3">
              <a
                href="#"
                className="w-10 h-10 rounded-xl bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 text-primary-foreground transition-all duration-300"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-xl bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 text-primary-foreground transition-all duration-300"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-xl bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 text-primary-foreground transition-all duration-300"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-primary-foreground/20 text-center text-sm text-primary-foreground/60">
          <p>&copy; {new Date().getFullYear()} SportSpot. Made with ❤️ in India. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;