import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { getDashboardRoute } from "@/lib/dashboardRoutes";
import { supabase } from "@/integrations/supabase/client";
import { useEmailVerification } from "@/hooks/useEmailVerification";

interface User {
  id: string;
  email: string;
  email_verified?: boolean;
}

interface SignUpAdditionalData {
  termsAccepted?: boolean;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  phoneNumber?: string;
  country?: string;
}

interface AuthContextType {
  user: User | null;
  profile: any | null;
  signUp: (email: string, password: string, displayName: string, role?: 'user' | 'creator' | 'freelancer' | 'seller' | 'lodging' | 'restaurant' | 'educator' | 'journalist' | 'artisan' | 'employer' | 'event_organizer' | 'musician', additionalData?: SignUpAdditionalData) => Promise<{ error: any; warning?: string }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Use the email verification hook to periodically check verification status
  const { isEmailVerified } = useEmailVerification(user?.id || null);

  useEffect(() => {
    // Check for existing session
    const checkAuth = async () => {
      try {
        // Check Supabase session first
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Get user profile from API
          const profileData = await api.getCurrentUser();
          if (profileData) {
            setUser({ 
              id: profileData.id || profileData.user_id, 
              email: profileData.email,
              email_verified: session.user.email_confirmed_at !== null
            });
            setProfile(profileData);
          } else {
            // No valid session
            setUser(null);
            setProfile(null);
          }
        } else {
          // No valid session
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        // No valid session - silently handle
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ 
          id: session.user.id, 
          email: session.user.email || '',
          email_verified: session.user.email_confirmed_at !== null
        });
        // Fetch profile
        api.getCurrentUser().then(profileData => {
          setProfile(profileData);
        });
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Effect to handle automatic redirect when email gets verified
  useEffect(() => {
    if (user && profile && isEmailVerified && !user.email_verified) {
      // Update user object with verified status
      setUser(prev => prev ? { ...prev, email_verified: true } : null);
      
      // Redirect to appropriate dashboard
      const dashboardRoute = getDashboardRoute(profile.roles);
      navigate(dashboardRoute, { replace: true });
    }
  }, [isEmailVerified, user, profile, navigate]);

  const signUp = async (email: string, password: string, displayName: string, role: 'user' | 'creator' | 'freelancer' | 'seller' | 'lodging' | 'restaurant' | 'educator' | 'journalist' | 'artisan' | 'employer' | 'event_organizer' | 'musician', additionalData?: SignUpAdditionalData) => {
    try {
      // Register user with backend API (which handles Supabase Auth, profile creation, and role assignment)
      const result = await api.register({ 
        email, 
        password, 
        displayName, 
        role, 
        ...additionalData 
      });

      if (result.user) {
        setUser({ 
          id: result.user.id, 
          email: result.user.email || '',
          email_verified: result.user.email_confirmed_at !== null
        });
      
        // If we got a session token, set it
        if (result.token) {
          // The API client already sets the token, but we should also set it in Supabase session
          // This ensures the frontend Supabase client is in sync
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session && result.token) {
              // Set the session manually if we have a token
              await supabase.auth.setSession({
                access_token: result.token,
                refresh_token: result.session?.refresh_token || '',
              });
            }
          } catch (sessionError) {
            console.error('Error setting session:', sessionError);
            // Continue anyway - the token is set in the API client
          }
        }
        
        // Check if there's a warning (e.g., email couldn't be sent)
        const warning = (result as any).warning;
        
        // If we have a token, fetch profile and handle navigation
        if (result.token) {
          // Fetch profile
          try {
            const profileData = await api.getCurrentUser();
            setProfile(profileData);
          
            // Extract primary role from roles array
            let primaryRole: string | string[] = role;
            if (profileData?.roles && Array.isArray(profileData.roles)) {
              primaryRole = profileData.roles;
            }
            
            // Only redirect if email is verified
            if (result.user.email_confirmed_at !== null) {
              // Redirect to appropriate dashboard
              const dashboardRoute = getDashboardRoute(primaryRole);
              navigate(dashboardRoute, { replace: true });
            } else {
              // Stay on auth page and show email verification message
              // Pass state to show success message on signin page
              navigate('/signin', { 
                replace: true,
                state: { fromSignup: true }
              });
            }
          } catch (profileError) {
            console.error('Error fetching profile:', profileError);
            // Still navigate to signin if email not verified
            if (!result.user.email_confirmed_at) {
              navigate('/signin', { 
                replace: true,
                state: { fromSignup: true }
              });
            }
          }
        } else {
          // No token - user needs to sign in (happens when created via Admin API)
          // Navigate to signin page with success message
          navigate('/signin', { 
            replace: true,
            state: { fromSignup: true }
          });
        }
        
        return { error: null, warning: warning || undefined };
      } else {
        return { error: { message: 'Failed to create user' } };
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      // Extract error message from API response
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      return { error: { message: errorMessage } };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Sign in with backend API
      const result = await api.login(email, password);

      if (result.user) {
        setUser({ 
          id: result.user.id, 
          email: result.user.email || '',
          email_verified: result.user.email_confirmed_at !== null
        });
        
        // If we got a session token, sync with Supabase client
        if (result.token && result.session) {
          try {
            await supabase.auth.setSession({
              access_token: result.token,
              refresh_token: result.session.refresh_token || '',
            });
          } catch (sessionError) {
            console.error('Error setting session:', sessionError);
            // Continue anyway - the token is set in the API client
          }
        }
        
        // Fetch profile
        const profileData = await api.getCurrentUser();
        setProfile(profileData);
      
        // Extract primary role from roles array
        let primaryRole: string | string[] | null = null;
        if (profileData?.roles && Array.isArray(profileData.roles)) {
          // Use the roles array directly, getDashboardRoute will handle it
          primaryRole = profileData.roles;
        }
      
        // Only redirect if email is verified
        if (result.user.email_confirmed_at !== null) {
          // Check if user has selected a subscription
          try {
            const subscription = await api.getMySubscription();
            // Backend returns default object without 'id' when no subscription exists
            // If subscription doesn't have an 'id' or 'created_at', it's a default and user needs to choose
            if (!subscription?.id || !subscription?.created_at) {
              navigate("/choose-subscription", { replace: true });
              return { error: null };
            }
          } catch (subError) {
            // If error getting subscription, assume they need to choose
            console.error("Error checking subscription:", subError);
            navigate("/choose-subscription", { replace: true });
            return { error: null };
          }
          
          // Redirect to appropriate dashboard
          const dashboardRoute = getDashboardRoute(primaryRole);
          navigate(dashboardRoute, { replace: true });
        } else {
          // Stay on auth page and show email verification message
          navigate('/signin', { replace: true });
        }
        return { error: null };
      } else {
        return { error: { message: 'Failed to sign in' } };
      }
    } catch (error: any) {
      console.error('Signin error:', error);
      // Extract error message from API response
      let errorMessage = 'Sign in failed. Please try again.';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      return { error: { message: errorMessage } };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        console.error('Google OAuth error:', error);
        // Provide more specific error message for common issues
        if (error.message.includes('invalid_request') || error.message.includes('OAuth')) {
          return { 
            error: { 
              message: 'Google sign-in is not properly configured. Please contact the administrator to set up Google OAuth in the Supabase dashboard.' 
            } 
          };
        }
        return { error: { message: error.message || 'Failed to sign in with Google. Please try again.' } };
      }

      // The OAuth flow will redirect the user, so we don't need to do anything here
      return { error: null };
    } catch (error: any) {
      console.error('Google OAuth exception:', error);
      // Provide more specific error message for common issues
      if (error.message && (error.message.includes('invalid_request') || error.message.includes('OAuth'))) {
        return { 
          error: { 
            message: 'Google sign-in is not properly configured. Please contact the administrator to set up Google OAuth in the Supabase dashboard.' 
          } 
        };
      }
      return { error: { message: error.message || 'An unexpected error occurred during Google sign-in. Please try again.' } };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    api.logout();
    setUser(null);
    setProfile(null);
    navigate("/");
  };

  const refreshUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error refreshing user:', error);
        return;
      }
      
      if (user) {
        setUser({
          id: user.id,
          email: user.email || '',
          email_verified: user.email_confirmed_at !== null
        });
        
        // Fetch updated profile
        try {
          const profileData = await api.getCurrentUser();
          setProfile(profileData);
        } catch (profileError) {
          console.error('Error fetching profile:', profileError);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
    } catch (error) {
      console.error('Error in refreshUser:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, signUp, signIn, signInWithGoogle, signOut, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};