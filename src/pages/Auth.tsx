import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Briefcase, Palette, Store, Home, UtensilsCrossed, GraduationCap, Newspaper, Wrench, Calendar, ArrowLeft, Music } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import logo from "@/assets/logo.png";
import { SEO } from "@/components/SEO";
import { countries } from "@/lib/countries";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Auth() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'user' | 'creator' | 'freelancer' | 'seller' | 'lodging' | 'restaurant' | 'educator' | 'journalist' | 'artisan' | 'employer' | 'event_organizer' | 'musician'>('user');
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedPhoneCode, setSelectedPhoneCode] = useState("+1"); // Default to US
  const [termsAccepted, setTermsAccepted] = useState(false);
  const { signUp, signIn, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("signin");
  
  useEffect(() => {
    // Check if we should default to signup tab
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get("tab");
    const roleParam = searchParams.get("role");
    
    if (tabParam === "signup") {
      setActiveTab("signup");
    }
    
    // Set role from URL parameter if provided
    if (roleParam) {
      const validRoles = ['user', 'creator', 'freelancer', 'seller', 'lodging', 'restaurant', 'educator', 'journalist', 'artisan', 'employer', 'event_organizer', 'musician'];
      const normalizedRole = roleParam.toLowerCase().replace(/\s+/g, '_');
      if (validRoles.includes(normalizedRole)) {
        setSelectedRole(normalizedRole as typeof selectedRole);
      }
    }
  }, [location]);

  // Auto-fill phone code when country is selected
  useEffect(() => {
    if (selectedCountry) {
      const country = countries.find(c => c.name === selectedCountry);
      if (country) {
        setSelectedPhoneCode(country.phoneCode);
      }
    }
  }, [selectedCountry]);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!termsAccepted) {
      toast({
        title: t("common.termsRequired"),
        description: t("auth.signUp.mustAcceptTerms"),
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const firstName = formData.get("firstName") as string;
    const middleName = formData.get("middleName") as string;
    const lastName = formData.get("lastName") as string;
    const displayName = `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`.trim();
    const role = selectedRole;
    const phoneNumber = `${selectedPhoneCode}${formData.get("phoneNumber") as string}`;
    const country = selectedCountry;

    const { error } = await signUp(email, password, displayName, role, {
      firstName,
      middleName,
      lastName,
      phoneNumber,
      country,
      termsAccepted: true
    });
    
    if (error) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    } else {
      toast({
        title: t("common.success"),
        description: t("auth.signUp.accountCreatedSuccess"),
      });
      // Navigation is handled by AuthContext.signUp
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await signIn(email, password);
    
    if (error) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    } else {
      // Check if user needs email verification
      // Navigation is handled by AuthContext.signIn
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const { error } = await signInWithGoogle();
    
    if (error) {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    }
    // Note: For OAuth, the browser will be redirected, so we don't need to handle success here
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Sign In or Sign Up - BLINNO Platform"
        description="Join BLINNO to connect with local creators, discover events, shop authentic products, and explore music. Create an account or sign in to access your dashboard."
        keywords={["BLINNO login", "platform", "sign in", "sign up", "create account", "local creators", "authentic products", "local events"]}
      />
      {/* Minimal Auth Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/")}
          >
            <img src={logo} alt="BLINNO Logo" className="w-8 h-8" />
            <span className="text-xl font-bold text-primary">
              BLINNO
            </span>
          </div>
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("common.back")} {t("common.home")}
          </Button>
        </div>
      </header>
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-md mx-auto">
          {/* Email verification alert */}
          {user && user.email_verified === false && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("auth.emailVerificationRequired")}</AlertTitle>
              <AlertDescription>
                {t("auth.emailVerificationDescription", { email: user.email })}
              </AlertDescription>
            </Alert>
          )}
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">{t("auth.signIn.title")}</TabsTrigger>
              <TabsTrigger value="signup">{t("auth.signUp.title")}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <Card>
                <CardHeader>
                  <CardTitle>{t("auth.signIn.welcomeBack")}</CardTitle>
                  <CardDescription>{t("auth.signIn.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">{t("auth.signIn.email")}</Label>
                      <Input
                        id="signin-email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">{t("auth.signIn.password")}</Label>
                      <Input
                        id="signin-password"
                        name="password"
                        type="password"
                        required
                      />
                    </div>
                    <Button 
                      variant="link" 
                      type="button" 
                      onClick={() => navigate("/auth/forgot-password")}
                      className="px-0 text-sm text-muted-foreground hover:text-foreground"
                    >
                      {t("auth.signIn.forgotPassword")}
                    </Button>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t("auth.signIn.title")}
                    </Button>
                    
                    <div className="relative my-4">
                      <Separator />
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                        {t("auth.orContinueWith")}
                      </span>
                    </div>
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full" 
                      onClick={handleGoogleSignIn}
                      disabled={isLoading}
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t("auth.continueWithGoogle")}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="signup">
              <Card>
                <CardHeader>
                  <CardTitle>{t("auth.signUp.title")}</CardTitle>
                  <CardDescription>{t("auth.signUp.joinToday")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-first-name">{t("auth.signUp.firstName")}</Label>
                        <Input
                          id="signup-first-name"
                          name="firstName"
                          type="text"
                          placeholder={t("auth.signUp.firstName")}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-middle-name">{t("auth.signUp.middleName")}</Label>
                        <Input
                          id="signup-middle-name"
                          name="middleName"
                          type="text"
                          placeholder={t("auth.signUp.middleName")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-last-name">{t("auth.signUp.lastName")}</Label>
                        <Input
                          id="signup-last-name"
                          name="lastName"
                          type="text"
                          placeholder={t("auth.signUp.lastName")}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">{t("auth.signUp.email")}</Label>
                      <Input
                        id="signup-email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">{t("auth.signUp.password")}</Label>
                      <Input
                        id="signup-password"
                        name="password"
                        type="password"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-country">{t("auth.signUp.country")}</Label>
                        <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                          <SelectTrigger id="signup-country">
                            <SelectValue placeholder={t("auth.signUp.selectCountry")} />
                          </SelectTrigger>
                          <SelectContent>
                            {countries.map((country) => (
                              <SelectItem key={country.code} value={country.name}>
                                {country.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="signup-phone">{t("auth.signUp.phoneNumber")}</Label>
                        <div className="flex gap-2">
                          <Select value={selectedPhoneCode} onValueChange={setSelectedPhoneCode}>
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {countries.map((country) => (
                                <SelectItem key={country.code} value={country.phoneCode}>
                                  {country.phoneCode}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            id="signup-phone"
                            name="phoneNumber"
                            type="tel"
                            placeholder={t("auth.signUp.phoneNumber")}
                            className="flex-1 min-w-[120px]"
                            required
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-role">{t("auth.iWantToJoinAs")}</Label>
                      <Select value={selectedRole} onValueChange={(value: 'user' | 'creator' | 'freelancer' | 'seller' | 'lodging' | 'restaurant' | 'educator' | 'journalist' | 'artisan' | 'employer' | 'event_organizer' | 'musician') => setSelectedRole(value)}>
                        <SelectTrigger id="signup-role">
                          <SelectValue placeholder={t("auth.signUp.role")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>{t("auth.roles.user")}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="creator">
                            <div className="flex items-center gap-2">
                              <Palette className="h-4 w-4" />
                              <span>{t("homepage.howToGetStarted.roleSelection.creator")}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="seller">
                            <div className="flex items-center gap-2">
                              <Store className="h-4 w-4" />
                              <span>{t("homepage.howToGetStarted.roleSelection.seller")}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="lodging">
                            <div className="flex items-center gap-2">
                              <Home className="h-4 w-4" />
                              <span>{t("homepage.howToGetStarted.roleSelection.lodgingProvider")}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="restaurant">
                            <div className="flex items-center gap-2">
                              <UtensilsCrossed className="h-4 w-4" />
                              <span>{t("homepage.howToGetStarted.roleSelection.restaurantOwner")}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="educator">
                            <div className="flex items-center gap-2">
                              <GraduationCap className="h-4 w-4" />
                              <span>{t("homepage.howToGetStarted.roleSelection.educator")}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="freelancer">
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4" />
                              <span>{t("homepage.howToGetStarted.roleSelection.freelancer")}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="journalist">
                            <div className="flex items-center gap-2">
                              <Newspaper className="h-4 w-4" />
                              <span>{t("homepage.howToGetStarted.roleSelection.journalist")}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="artisan">
                            <div className="flex items-center gap-2">
                              <Wrench className="h-4 w-4" />
                              <span>{t("homepage.howToGetStarted.roleSelection.artisan")}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="employer">
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4" />
                              <span>{t("homepage.howToGetStarted.roleSelection.employer")}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="event_organizer">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>{t("homepage.howToGetStarted.roleSelection.eventOrganizer")}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="musician">
                            <div className="flex items-center gap-2">
                              <Music className="h-4 w-4" />
                              <span>{t("homepage.howToGetStarted.roleSelection.musician")}</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {t("auth.chooseHowToUse")}
                      </p>
                    </div>
                    
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="terms-accepted"
                        checked={termsAccepted}
                        onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                        required
                      />
                      <label
                        htmlFor="terms-accepted"
                        className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {t("auth.signUp.acceptTerms")}{" "}
                        <a
                          href="/terms"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline hover:no-underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {t("auth.signUp.termsOfService")}
                        </a>
                      </label>
                    </div>
                    
                    <Button type="submit" className="w-full" disabled={isLoading || !termsAccepted}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t("auth.signUp.title")}
                    </Button>
                    
                    <div className="relative my-4">
                      <Separator />
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                        {t("auth.orContinueWith")}
                      </span>
                    </div>
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full" 
                      onClick={handleGoogleSignIn}
                      disabled={isLoading}
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : t("auth.continueWithGoogle")}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      {t("auth.googleSignInDescription")}
                    </p>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
