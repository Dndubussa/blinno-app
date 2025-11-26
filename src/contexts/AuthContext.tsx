import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { getDashboardRoute } from "@/lib/dashboardRoutes";
import { supabase } from "@/integrations/supabase/client";

interface User {
  id: string;
  email: string;
  email_verified?: boolean;
}

interface SignUpAdditionalData {
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
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
            setUser({ id: profileData.id || profileData.user_id, email: profileData.email });
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
        setUser({ id: session.user.id, email: session.user.email || '' });
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

  const signUp = async (email: string, password: string, displayName: string, role: 'user' | 'creator' | 'freelancer' | 'seller' | 'lodging' | 'restaurant' | 'educator' | 'journalist' | 'artisan' | 'employer' | 'event_organizer' | 'musician' = 'user', additionalData?: SignUpAdditionalData) => {
    try {
      // Sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            first_name: additionalData?.firstName,
            middle_name: additionalData?.middleName,
            last_name: additionalData?.lastName,
            phone: additionalData?.phoneNumber,
            country: additionalData?.country
          }
        }
      });

      if (error) {
        return { error: { message: error.message } };
      }

      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email || '' });
        
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
        
        // Redirect to appropriate dashboard
        const dashboardRoute = getDashboardRoute(primaryRole);
        navigate(dashboardRoute, { replace: true });
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
        setUser({ id: data.user.id, email: data.user.email || '' });
        // Fetch profile
        const profileData = await api.getCurrentUser();
        setProfile(profileData);
        
        // Extract primary role from roles array
        let primaryRole: string | string[] | null = null;
        if (profileData?.roles && Array.isArray(profileData.roles)) {
          // Use the roles array directly, getDashboardRoute will handle it
          primaryRole = profileData.roles;
        }
        
        // Redirect to appropriate dashboard
        const dashboardRoute = getDashboardRoute(primaryRole);
        navigate(dashboardRoute, { replace: true });
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
          redirectTo: window.location.origin
        }
      });

      if (error) {
        return { error: { message: error.message } };
      }

      // The OAuth flow will redirect the user, so we don't need to do anything here
      return { error: null };
    } catch (error: any) {
      return { error: { message: error.message } };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    api.logout();
    setUser(null);
    setProfile(null);
    navigate("/");
  };

  return (
    <AuthContext.Provider value={{ user, profile, signUp, signIn, signInWithGoogle, signOut, loading }}>
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