import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  UserPlus, 
  Mail, 
  Shield, 
  Store, 
  TrendingUp, 
  CreditCard, 
  CheckCircle2,
  ArrowRight,
  Users,
  Briefcase,
  Calendar,
  Music,
  GraduationCap,
  Newspaper,
  Hammer,
  Building2,
  UtensilsCrossed,
  Home,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AnimatedSection } from "./AnimatedSection";

const roles = [
  { name: "Creator", icon: Sparkles, description: "Showcase your work and sell products" },
  { name: "Freelancer", icon: Briefcase, description: "Offer professional services" },
  { name: "Seller", icon: Store, description: "Sell products in the marketplace" },
  { name: "Event Organizer", icon: Calendar, description: "Create and manage events" },
  { name: "Musician", icon: Music, description: "Share music and book performances" },
  { name: "Educator", icon: GraduationCap, description: "Create and sell courses" },
  { name: "Journalist", icon: Newspaper, description: "Publish articles and news" },
  { name: "Artisan", icon: Hammer, description: "Showcase handmade crafts" },
  { name: "Restaurant Owner", icon: UtensilsCrossed, description: "List your restaurant" },
  { name: "Lodging Provider", icon: Home, description: "Offer accommodations" },
  { name: "Employer", icon: Building2, description: "Post jobs and hire talent" },
];

export function HowToGetStarted() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const steps = [
    {
      number: 1,
      icon: UserPlus,
      title: "Create Your Account",
      description: "Sign up with your email address. It's free and takes less than 2 minutes!",
      details: [
        "Click 'Sign Up' in the top right corner",
        "Enter your email and create a password",
        "Fill in your basic information (name, country, phone)",
        "Choose your role based on what you want to do on the platform"
      ],
      action: "Sign Up Now",
      actionLink: "/auth?tab=signup"
    },
    {
      number: 2,
      icon: Mail,
      title: "Verify Your Email",
      description: "Check your inbox and click the verification link to activate your account.",
      details: [
        "We'll send you a verification email",
        "Click the link in the email to verify",
        "Your account will be activated immediately",
        "You can start using the platform right away"
      ],
      action: null,
      actionLink: null
    },
    {
      number: 3,
      icon: Store,
      title: "Complete Your Profile",
      description: "Add your profile picture, bio, and showcase your work to attract customers.",
      details: [
        "Upload a professional profile picture",
        "Write a compelling bio about yourself",
        "Add your portfolio, products, or services",
        "Set up your payment preferences"
      ],
      action: user ? "Go to Dashboard" : null,
      actionLink: user ? "/dashboard" : null
    },
    {
      number: 4,
      icon: TrendingUp,
      title: "Start Earning",
      description: "Begin selling, offering services, or monetizing your content on the platform.",
      details: [
        "List your products or services",
        "Set your pricing and availability",
        "Respond to inquiries and bookings",
        "Track your earnings in your dashboard"
      ],
      action: user ? "Explore Features" : null,
      actionLink: user ? "/marketplace" : null
    },
    {
      number: 5,
      icon: CreditCard,
      title: "Get Paid Securely",
      description: "Receive payments through Click Pesa and request payouts whenever you're ready.",
      details: [
        "Customers pay securely via Click Pesa",
        "Funds are held safely until delivery",
        "Request payouts to your mobile money account",
        "Track all transactions in your dashboard"
      ],
      action: user ? "View Earnings" : null,
      actionLink: user ? "/earnings" : null
    }
  ];

  return (
    <section className="py-16 bg-gradient-to-b from-background to-muted/20" id="how-to-get-started">
      <div className="container mx-auto px-4">
        <AnimatedSection>
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              Getting Started
            </Badge>
            <h2 className="text-4xl font-bold mb-4">How to Get Started on BLINNO</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join thousands of creators and businesses already making money on our platform. 
              Get started in just 5 simple steps!
            </p>
          </div>
        </AnimatedSection>

        {/* Step-by-Step Guide */}
        <div className="max-w-5xl mx-auto space-y-6 mb-12">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <AnimatedSection key={step.number} delay={index * 100}>
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                          <Icon className="h-8 w-8 text-primary" />
                        </div>
                        <div className="mt-4 text-center">
                          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto font-bold">
                            {step.number}
                          </div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold mb-2">{step.title}</h3>
                        <p className="text-muted-foreground mb-4">{step.description}</p>
                        <ul className="space-y-2 mb-4">
                          {step.details.map((detail, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                              <span className="text-sm">{detail}</span>
                            </li>
                          ))}
                        </ul>
                        {step.action && step.actionLink && (
                          <Button
                            variant="outline"
                            onClick={() => navigate(step.actionLink!)}
                            className="mt-2"
                          >
                            {step.action}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </AnimatedSection>
            );
          })}
        </div>

        {/* Role Selection */}
        <AnimatedSection delay={500}>
          <Card className="max-w-5xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl mb-2">Choose Your Role</CardTitle>
              <CardDescription>
                Select the role that best describes what you want to do on BLINNO
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {roles.map((role) => {
                  const RoleIcon = role.icon;
                  const isSelected = selectedRole === role.name;
                  return (
                    <button
                      key={role.name}
                      onClick={() => setSelectedRole(role.name)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <RoleIcon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                          isSelected ? "text-primary" : "text-muted-foreground"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-semibold text-sm mb-1 ${
                            isSelected ? "text-primary" : ""
                          }`}>
                            {role.name}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {role.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {selectedRole && (
                <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm text-muted-foreground mb-3">
                    You've selected <strong className="text-foreground">{selectedRole}</strong>. 
                    This role will be set when you create your account.
                  </p>
                  {!user && (
                    <Button
                      onClick={() => {
                        const roleMap: Record<string, string> = {
                          'Creator': 'creator',
                          'Freelancer': 'freelancer',
                          'Seller': 'seller',
                          'Event Organizer': 'event_organizer',
                          'Musician': 'musician',
                          'Educator': 'educator',
                          'Journalist': 'journalist',
                          'Artisan': 'artisan',
                          'Restaurant Owner': 'restaurant',
                          'Lodging Provider': 'lodging',
                          'Employer': 'employer'
                        };
                        const roleParam = roleMap[selectedRole] || 'user';
                        navigate(`/auth?tab=signup&role=${roleParam}`);
                      }}
                      className="w-full sm:w-auto"
                    >
                      Sign Up as {selectedRole}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedSection>

        {/* Quick Start CTA */}
        <AnimatedSection delay={600}>
          <div className="text-center mt-12">
            <div className="inline-flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-sm font-semibold text-muted-foreground">
                Join 10,000+ active users
              </span>
            </div>
            <h3 className="text-2xl font-bold mb-4">Ready to Get Started?</h3>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Create your free account today and start monetizing your skills, products, or services. 
              No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!user ? (
                <>
                  <Button
                    size="lg"
                    onClick={() => navigate("/auth?tab=signup")}
                    className="text-lg px-8 py-6"
                  >
                    <UserPlus className="mr-2 h-5 w-5" />
                    Create Free Account
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("/auth")}
                    className="text-lg px-8 py-6"
                  >
                    Sign In
                  </Button>
                </>
              ) : (
                <Button
                  size="lg"
                  onClick={() => navigate("/dashboard")}
                  className="text-lg px-8 py-6"
                >
                  <Shield className="mr-2 h-5 w-5" />
                  Go to Dashboard
                </Button>
              )}
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Free to join</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>Start earning immediately</span>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

