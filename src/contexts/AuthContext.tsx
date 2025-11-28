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
  signUp: (email: string, password: string, displayName: string, role?: 'user' | 'creator' | 'freelancer' | 'seller' | 'lodging' | 'restaurant' | 'educator' | 'journalist' | 'artisan' | 'employer' | 'event_organizer' | 'musician', additionalData?: SignUpAdditionalData) => Promise<{ error: any }>;
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
      // Sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            ...(additionalData && {
              first_name: additionalData?.firstName,
              middle_name: additionalData?.middleName,
              last_name: additionalData?.lastName,
              phone: additionalData?.phoneNumber,
              country: additionalData?.country
            })
          }
        }
      });

      if (error) {
        return { error: { message: error.message } };
      }

      if (data.user) {
        setUser({ 
          id: data.user.id, 
          email: data.user.email || '',
          email_verified: data.user.email_confirmed_at !== null
        });
      
        // Register user with API to set role and additional data
        try {
          await api.register({ email, password, displayName, role, ...additionalData });
        } catch (apiError) {
          console.error('API registration error:', apiError);
        }
      
        // Fetch profile
        const profileData = await api.getCurrentUser();
        setProfile(profileData);
      
        // Extract primary role from roles array (prefer non-'user' role, or use the sign-up role)
        let primaryRole: string | string[] = role;
        if (profileData?.roles && Array.isArray(profileData.roles)) {
          // Use the roles array directly, getDashboardRoute will handle it
          primaryRole = profileData.roles;
        }
      
        // Only redirect if email is verified
        if (data.user.email_confirmed_at !== null) {
          // Redirect to appropriate dashboard
          const dashboardRoute = getDashboardRoute(primaryRole);
          navigate(dashboardRoute, { replace: true });
        } else {
          // Stay on auth page and show email verification message
          navigate('/auth', { replace: true });
        }
        return { error: null };
      } else {
        return { error: { message: 'Failed to create user' } };
      }
    } catch (error: any) {
      return { error: { message: error.message } };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return { error: { message: error.message } };
      }

      if (data.user) {
        setUser({ 
          id: data.user.id, 
          email: data.user.email || '',
          email_verified: data.user.email_confirmed_at !== null
        });
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
        if (data.user.email_confirmed_at !== null) {
          // Redirect to appropriate dashboard
          const dashboardRoute = getDashboardRoute(primaryRole);
          navigate(dashboardRoute, { replace: true });
        } else {
          // Stay on auth page and show email verification message
          navigate('/auth', { replace: true });
        }
        return { error: null };
      } else {
        return { error: { message: 'Failed to sign in' } };
      }
    } catch (error: any) {
      return { error: { message: error.message } };
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