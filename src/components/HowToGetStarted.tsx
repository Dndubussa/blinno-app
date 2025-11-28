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
import { useTranslation } from "react-i18next";

export function HowToGetStarted() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const roles = [
    { name: t("homepage.howToGetStarted.roleSelection.creator"), icon: Sparkles, description: t("homepage.howToGetStarted.roleSelection.creatorDesc"), key: "creator" },
    { name: t("homepage.howToGetStarted.roleSelection.freelancer"), icon: Briefcase, description: t("homepage.howToGetStarted.roleSelection.freelancerDesc"), key: "freelancer" },
    { name: t("homepage.howToGetStarted.roleSelection.seller"), icon: Store, description: t("homepage.howToGetStarted.roleSelection.sellerDesc"), key: "seller" },
    { name: t("homepage.howToGetStarted.roleSelection.eventOrganizer"), icon: Calendar, description: t("homepage.howToGetStarted.roleSelection.eventOrganizerDesc"), key: "event_organizer" },
    { name: t("homepage.howToGetStarted.roleSelection.musician"), icon: Music, description: t("homepage.howToGetStarted.roleSelection.musicianDesc"), key: "musician" },
    { name: t("homepage.howToGetStarted.roleSelection.educator"), icon: GraduationCap, description: t("homepage.howToGetStarted.roleSelection.educatorDesc"), key: "educator" },
    { name: t("homepage.howToGetStarted.roleSelection.journalist"), icon: Newspaper, description: t("homepage.howToGetStarted.roleSelection.journalistDesc"), key: "journalist" },
    { name: t("homepage.howToGetStarted.roleSelection.artisan"), icon: Hammer, description: t("homepage.howToGetStarted.roleSelection.artisanDesc"), key: "artisan" },
    { name: t("homepage.howToGetStarted.roleSelection.restaurantOwner"), icon: UtensilsCrossed, description: t("homepage.howToGetStarted.roleSelection.restaurantOwnerDesc"), key: "restaurant" },
    { name: t("homepage.howToGetStarted.roleSelection.lodgingProvider"), icon: Home, description: t("homepage.howToGetStarted.roleSelection.lodgingProviderDesc"), key: "lodging" },
    { name: t("homepage.howToGetStarted.roleSelection.employer"), icon: Building2, description: t("homepage.howToGetStarted.roleSelection.employerDesc"), key: "employer" },
  ];

  const steps = [
    {
      number: 1,
      icon: UserPlus,
      title: t("homepage.howToGetStarted.step1.title"),
      description: t("homepage.howToGetStarted.step1.description"),
      details: [
        t("homepage.howToGetStarted.step1.detail1"),
        t("homepage.howToGetStarted.step1.detail2"),
        t("homepage.howToGetStarted.step1.detail3"),
        t("homepage.howToGetStarted.step1.detail4")
      ],
      action: t("homepage.howToGetStarted.step1.action"),
      actionLink: "/signup"
    },
    {
      number: 2,
      icon: Mail,
      title: t("homepage.howToGetStarted.step2.title"),
      description: t("homepage.howToGetStarted.step2.description"),
      details: [
        t("homepage.howToGetStarted.step2.detail1"),
        t("homepage.howToGetStarted.step2.detail2"),
        t("homepage.howToGetStarted.step2.detail3"),
        t("homepage.howToGetStarted.step2.detail4")
      ],
      action: null,
      actionLink: null
    },
    {
      number: 3,
      icon: Store,
      title: t("homepage.howToGetStarted.step3.title"),
      description: t("homepage.howToGetStarted.step3.description"),
      details: [
        t("homepage.howToGetStarted.step3.detail1"),
        t("homepage.howToGetStarted.step3.detail2"),
        t("homepage.howToGetStarted.step3.detail3"),
        t("homepage.howToGetStarted.step3.detail4")
      ],
      action: user ? t("homepage.howToGetStarted.step3.action") : null,
      actionLink: user ? "/dashboard" : null
    },
    {
      number: 4,
      icon: TrendingUp,
      title: t("homepage.howToGetStarted.step4.title"),
      description: t("homepage.howToGetStarted.step4.description"),
      details: [
        t("homepage.howToGetStarted.step4.detail1"),
        t("homepage.howToGetStarted.step4.detail2"),
        t("homepage.howToGetStarted.step4.detail3"),
        t("homepage.howToGetStarted.step4.detail4")
      ],
      action: user ? t("homepage.howToGetStarted.step4.action") : null,
      actionLink: user ? "/marketplace" : null
    },
    {
      number: 5,
      icon: CreditCard,
      title: t("homepage.howToGetStarted.step5.title"),
      description: t("homepage.howToGetStarted.step5.description"),
      details: [
        t("homepage.howToGetStarted.step5.detail1"),
        t("homepage.howToGetStarted.step5.detail2"),
        t("homepage.howToGetStarted.step5.detail3"),
        t("homepage.howToGetStarted.step5.detail4")
      ],
      action: user ? t("homepage.howToGetStarted.step5.action") : null,
      actionLink: user ? "/earnings" : null
    }
  ];

  return (
    <section className="py-16 bg-gradient-to-b from-background to-muted/20" id="how-to-get-started">
      <div className="container mx-auto px-4">
        <AnimatedSection>
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">
              {t("homepage.howToGetStarted.badge")}
            </Badge>
            <h2 className="text-4xl font-bold mb-4">{t("homepage.howToGetStarted.title")}</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("homepage.howToGetStarted.subtitle")}
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
              <CardTitle className="text-2xl mb-2">{t("homepage.howToGetStarted.roleSelection.title")}</CardTitle>
              <CardDescription>
                {t("homepage.howToGetStarted.roleSelection.subtitle")}
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
                    {t("homepage.howToGetStarted.roleSelection.selected")} <strong className="text-foreground">{selectedRole}</strong>. 
                    {t("homepage.howToGetStarted.roleSelection.roleSetOnSignup")}
                  </p>
                  {!user && (
                    <Button
                      onClick={() => {
                        const selectedRoleObj = roles.find(r => r.name === selectedRole);
                        const roleParam = selectedRoleObj?.key || 'user';
                        navigate(`/signup?role=${roleParam}`);
                      }}
                      className="w-full sm:w-auto"
                    >
                      {t("homepage.howToGetStarted.roleSelection.signUpAs")} {selectedRole}
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
                {t("homepage.howToGetStarted.cta.joinUsers")}
              </span>
            </div>
            <h3 className="text-2xl font-bold mb-4">{t("homepage.howToGetStarted.cta.readyToStart")}</h3>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              {t("homepage.howToGetStarted.cta.description")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!user ? (
                <>
                  <Button
                    size="lg"
                    onClick={() => navigate("/signup")}
                    className="text-lg px-8 py-6"
                  >
                    <UserPlus className="mr-2 h-5 w-5" />
                    {t("homepage.howToGetStarted.cta.createFreeAccount")}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("/signin")}
                    className="text-lg px-8 py-6"
                  >
                    {t("homepage.howToGetStarted.cta.signIn")}
                  </Button>
                </>
              ) : (
                <Button
                  size="lg"
                  onClick={() => navigate("/dashboard")}
                  className="text-lg px-8 py-6"
                >
                  <Shield className="mr-2 h-5 w-5" />
                  {t("homepage.howToGetStarted.cta.goToDashboard")}
                </Button>
              )}
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>{t("homepage.howToGetStarted.cta.freeToJoin")}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>{t("homepage.howToGetStarted.cta.noCreditCard")}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span>{t("homepage.howToGetStarted.cta.startEarning")}</span>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

