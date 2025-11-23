import { Facebook, Twitter, Instagram, Youtube, Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const Footer = () => {
  const navigate = useNavigate();

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-card border-t border-border mt-16">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <div 
              className="flex items-center gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => {
                navigate("/");
                scrollToTop();
              }}
            >
              <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center font-bold text-primary-foreground">
                BL
              </div>
              <span className="text-lg font-bold text-primary">
                BLINNO
              </span>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              Your platform to discover, create, and connect with all things Tanzanian. Supporting local talent and culture worldwide.
            </p>
            <div className="flex gap-3">
              <Button 
                size="icon" 
                variant="ghost" 
                className="hover:text-primary"
                onClick={() => window.open("https://facebook.com", "_blank")}
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="hover:text-primary"
                onClick={() => window.open("https://twitter.com", "_blank")}
                aria-label="Twitter"
              >
                <Twitter className="h-4 w-4" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="hover:text-primary"
                onClick={() => window.open("https://instagram.com", "_blank")}
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="hover:text-primary"
                onClick={() => window.open("https://youtube.com", "_blank")}
                aria-label="YouTube"
              >
                <Youtube className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={() => navigate("/about")}
                  className="text-muted-foreground hover:text-primary text-sm transition-colors text-left"
                >
                  About Us
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate("/how-it-works")}
                  className="text-muted-foreground hover:text-primary text-sm transition-colors text-left"
                >
                  How It Works
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate("/featured-creators")}
                  className="text-muted-foreground hover:text-primary text-sm transition-colors text-left"
                >
                  Featured Creators
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate("/success-stories")}
                  className="text-muted-foreground hover:text-primary text-sm transition-colors text-left"
                >
                  Success Stories
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate("/blog")}
                  className="text-muted-foreground hover:text-primary text-sm transition-colors text-left"
                >
                  Blog
                </button>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Categories</h3>
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={() => navigate("/events")}
                  className="text-muted-foreground hover:text-primary text-sm transition-colors text-left"
                >
                  Events
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate("/marketplace")}
                  className="text-muted-foreground hover:text-primary text-sm transition-colors text-left"
                >
                  Marketplace
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate("/music")}
                  className="text-muted-foreground hover:text-primary text-sm transition-colors text-left"
                >
                  Music & Entertainment
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate("/jobs")}
                  className="text-muted-foreground hover:text-primary text-sm transition-colors text-left"
                >
                  Jobs & Opportunities
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate("/education")}
                  className="text-muted-foreground hover:text-primary text-sm transition-colors text-left"
                >
                  Education
                </button>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                <span className="text-muted-foreground text-sm">
                  Dar es Salaam, Tanzania
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                <a 
                  href="tel:+255123456789"
                  className="text-muted-foreground hover:text-primary text-sm transition-colors"
                >
                  +255 123 456 789
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                <a 
                  href="mailto:hello@blinno.com"
                  className="text-muted-foreground hover:text-primary text-sm transition-colors"
                >
                  hello@blinno.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm">
            © 2024 BLINNO. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm">
            <button 
              onClick={() => navigate("/privacy")}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Privacy Policy
            </button>
            <button 
              onClick={() => navigate("/terms")}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Terms of Service
            </button>
            <button 
              onClick={() => navigate("/cookies")}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Cookie Policy
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
