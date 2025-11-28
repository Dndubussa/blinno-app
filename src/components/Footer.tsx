import { Facebook, Twitter, Instagram, Youtube, Mail, MapPin, Phone, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import logo from "@/assets/logo.png";
import { TrustPilotWidget } from "@/components/TrustPilotWidget";

export const Footer = () => {
  const { t } = useTranslation();
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
              <img src={logo} alt="BLINNO Logo" className="w-8 h-8" />
              <span className="text-lg font-bold text-primary">
                BLINNO
              </span>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              {t("footer.about")}
            </p>
            <div className="flex gap-3">
              <Button 
                size="icon" 
                variant="ghost" 
                className="hover:text-primary"
                onClick={() => window.open("https://facebook.com/blinnoapp", "_blank")}
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="hover:text-primary"
                onClick={() => window.open("https://twitter.com/blinnoapp", "_blank")}
                aria-label="Twitter"
              >
                <Twitter className="h-4 w-4" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="hover:text-primary"
                onClick={() => window.open("https://instagram.com/blinnoapp", "_blank")}
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="hover:text-primary"
                onClick={() => window.open("https://youtube.com/@blinnoapp", "_blank")}
                aria-label="YouTube"
              >
                <Youtube className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">{t("footer.quickLinks")}</h3>
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={() => navigate("/about")}
                  className="text-muted-foreground hover:text-primary text-sm transition-colors text-left"
                >
                  {t("footer.aboutUs")}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate("/how-it-works")}
                  className="text-muted-foreground hover:text-primary text-sm transition-colors text-left"
                >
                  {t("footer.howItWorks")}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate("/featured-creators")}
                  className="text-muted-foreground hover:text-primary text-sm transition-colors text-left"
                >
                  {t("footer.featuredCreators")}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate("/success-stories")}
                  className="text-muted-foreground hover:text-primary text-sm transition-colors text-left"
                >
                  {t("footer.successStories")}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate("/blog")}
                  className="text-muted-foreground hover:text-primary text-sm transition-colors text-left"
                >
                  {t("footer.blog")}
                </button>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">{t("footer.categories")}</h3>
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={() => navigate("/events")}
                  className="text-muted-foreground hover:text-primary text-sm transition-colors text-left"
                >
                  {t("footer.events")}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate("/marketplace")}
                  className="text-muted-foreground hover:text-primary text-sm transition-colors text-left"
                >
                  {t("footer.marketplace")}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate("/music")}
                  className="text-muted-foreground hover:text-primary text-sm transition-colors text-left"
                >
                  {t("footer.musicEntertainment")}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate("/jobs")}
                  className="text-muted-foreground hover:text-primary text-sm transition-colors text-left"
                >
                  {t("footer.jobsOpportunities")}
                </button>
              </li>
              <li>
                <button 
                  onClick={() => navigate("/education")}
                  className="text-muted-foreground hover:text-primary text-sm transition-colors text-left"
                >
                  {t("footer.education")}
                </button>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">{t("footer.contactUs")}</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                <span className="text-muted-foreground text-sm">
                  {t("footer.worldwide")}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                <a 
                  href="tel:+255712345678"
                  className="text-muted-foreground hover:text-primary text-sm transition-colors"
                >
                  +1 234 567 890
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
              <li className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-muted-foreground text-sm">
                  {t("footer.globalPlatform")}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* TrustPilot Widget */}
        <div className="border-t border-border mt-8 pt-8">
          <div className="mb-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img 
                src="/TrustPilot.png" 
                alt="TrustPilot" 
                className="h-8 w-auto"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <h3 className="font-semibold text-foreground mb-4 text-center">Trusted by our community</h3>
            <TrustPilotWidget className="flex justify-center" />
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm">
            {t("footer.copyright")}
          </p>
          <div className="flex gap-6 text-sm">
            <button 
              onClick={() => navigate("/privacy")}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {t("footer.privacyPolicy")}
            </button>
            <button 
              onClick={() => navigate("/terms")}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {t("footer.termsOfService")}
            </button>
            <button 
              onClick={() => navigate("/cookies")}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {t("footer.cookiePolicy")}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};