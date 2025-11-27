import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useEmailVerification = (userId: string | null) => {
  const [isEmailVerified, setIsEmailVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsEmailVerified(null);
      setLoading(false);
      return;
    }

    const checkEmailVerification = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('Error fetching user:', error);
          setIsEmailVerified(null);
        } else if (user) {
          setIsEmailVerified(user.email_confirmed_at !== null);
        }
      } catch (error) {
        console.error('Error checking email verification:', error);
        setIsEmailVerified(null);
      } finally {
        setLoading(false);
      }
    };

    checkEmailVerification();

    // Set up a listener for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsEmailVerified(session.user.email_confirmed_at !== null);
      } else {
        setIsEmailVerified(null);
      }
      setLoading(false);
    });

    // Periodically check email verification status every 30 seconds
    const interval = setInterval(() => {
      if (userId) {
        supabase.auth.getUser().then(({ data: { user }, error }) => {
          if (!error && user) {
            setIsEmailVerified(user.email_confirmed_at !== null);
          }
        });
      }
    }, 30000); // Check every 30 seconds

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [userId]);

  return { isEmailVerified, loading };
};