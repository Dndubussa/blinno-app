import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Briefcase, Palette, Store, Home, UtensilsCrossed, GraduationCap, Newspaper, Wrench, Calendar, ArrowLeft } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import logo from "@/assets/logo.png";
import { SEO } from "@/components/SEO";

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'user' | 'creator' | 'freelancer' | 'seller' | 'lodging' | 'restaurant' | 'educator' | 'journalist' | 'artisan' | 'employer' | 'event_organizer'>('user');
  const { signUp, signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const displayName = formData.get("displayName") as string;
    const role = selectedRole;

    const { error } = await signUp(email, password, displayName, role);
    
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    } else {
      toast({
        title: "Success",
        description: "Account created successfully! Redirecting to your dashboard...",
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
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    } else {
      toast({
        title: "Success",
        description: "Logged in successfully! Redirecting to your dashboard...",
      });
      // Navigation is handled by AuthContext.signIn
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const { error } = await signInWithGoogle();
    
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Sign In or Sign Up - BLINNO Platform"
        description="Join BLINNO to connect with Tanzanian creators, discover events, shop authentic products, and explore music. Create an account or sign in to access your dashboard."
        keywords={["BLINNO login", "Tanzanian platform", "sign in", "sign up", "create account", "Tanzania creators", "authentic products", "local events"]}
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
            Back to Home
          </Button>
        </div>
      </header>
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-md mx-auto">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <Card>
                <CardHeader>
                  <CardTitle>Welcome Back</CardTitle>
                  <CardDescription>Sign in to your BLINNO account</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
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
                      Forgot password?
                    </Button>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign In
                    </Button>
                    
                    <div className="relative my-4">
                      <Separator />
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                        Or continue with
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
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Continue with Google"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="signup">
              <Card>
                <CardHeader>
                  <CardTitle>Create Account</CardTitle>
                  <CardDescription>Join BLINNO today</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Display Name</Label>
                      <Input
                        id="signup-name"
                        name="displayName"
                        type="text"
                        placeholder="Your name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        name="password"
                        type="password"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-role">I want to join as</Label>
                      <Select value={selectedRole} onValueChange={(value: 'user' | 'creator' | 'freelancer' | 'seller' | 'lodging' | 'restaurant' | 'educator' | 'journalist' | 'artisan' | 'employer' | 'event_organizer') => setSelectedRole(value)}>
                        <SelectTrigger id="signup-role">
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>User</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="creator">
                            <div className="flex items-center gap-2">
                              <Palette className="h-4 w-4" />
                              <span>Creator</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="seller">
                            <div className="flex items-center gap-2">
                              <Store className="h-4 w-4" />
                              <span>Seller</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="lodging">
                            <div className="flex items-center gap-2">
                              <Home className="h-4 w-4" />
                              <span>Lodging</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="restaurant">
                            <div className="flex items-center gap-2">
                              <UtensilsCrossed className="h-4 w-4" />
                              <span>Restaurant</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="educator">
                            <div className="flex items-center gap-2">
                              <GraduationCap className="h-4 w-4" />
                              <span>Educator</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="freelancer">
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4" />
                              <span>Freelancer</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="journalist">
                            <div className="flex items-center gap-2">
                              <Newspaper className="h-4 w-4" />
                              <span>Journalist</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="artisan">
                            <div className="flex items-center gap-2">
                              <Wrench className="h-4 w-4" />
                              <span>Artisan</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="employer">
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4" />
                              <span>Employer</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="event_organizer">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>Event Organizer</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Choose how you want to use BLINNO
                      </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign Up
                    </Button>
                    
                    <div className="relative my-4">
                      <Separator />
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                        Or continue with
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
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Continue with Google"}
                    </Button>
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
