import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { getDashboardRoute } from "@/lib/dashboardRoutes";

interface User {
  id: string;
  email: string;
  email_verified?: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: any | null;
  signUp: (email: string, password: string, displayName: string, role?: 'user' | 'creator' | 'freelancer' | 'seller' | 'lodging' | 'restaurant' | 'educator' | 'journalist' | 'artisan' | 'employer' | 'event_organizer') => Promise<{ error: any }>;
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
        const profileData = await api.getCurrentUser();
        if (profileData) {
          setUser({ id: profileData.id || profileData.user_id, email: profileData.email });
          setProfile(profileData);
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
  }, []);

  const signUp = async (email: string, password: string, displayName: string, role: 'user' | 'creator' | 'freelancer' | 'seller' | 'lodging' | 'restaurant' | 'educator' | 'journalist' | 'artisan' | 'employer' | 'event_organizer' = 'user') => {
    try {
      const result = await api.register({ email, password, displayName, role });
      setUser(result.user);
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
    } catch (error: any) {
      return { error: { message: error.message } };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const result = await api.login(email, password);
      setUser(result.user);
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
    } catch (error: any) {
      return { error: { message: error.message } };
    }
  };

  const signInWithGoogle = async () => {
    // TODO: Implement Google OAuth
    return { error: { message: 'Google OAuth not yet implemented' } };
  };

  const signOut = async () => {
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
