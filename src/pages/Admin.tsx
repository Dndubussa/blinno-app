import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, FileText, BarChart3 } from "lucide-react";
import { UserManagement } from "@/components/admin/UserManagement";
import { ContentModeration } from "@/components/admin/ContentModeration";
import { Analytics } from "@/components/admin/Analytics";
import { RefundManagement } from "@/components/admin/RefundManagement";
import { EnhancedAnalytics } from "@/components/admin/EnhancedAnalytics";
import { Button } from "@/components/ui/button";

export default function Admin() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  
  // Get current section from URL hash or default based on role
  const currentSection = location.hash.replace('#', '') || (isAdmin ? 'users' : 'content');

  useEffect(() => {
    if (!loading && !user) {
      navigate("/signin");
      return;
    }

    if (user) {
      checkRoles();
    }
    
    // If no hash, set default based on role
    if (!location.hash) {
      const defaultSection = isAdmin ? 'users' : 'content';
      navigate(`/admin#${defaultSection}`, { replace: true });
    }
  }, [user, loading, navigate, isAdmin, location.hash]);

  const checkRoles = async () => {
    if (!user) return;

    try {
      const [adminCheck, moderatorCheck] = await Promise.all([
        supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        }),
        supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'moderator'
        })
      ]);

      if (adminCheck.error) throw adminCheck.error;
      if (moderatorCheck.error) throw moderatorCheck.error;

      const hasAdmin = adminCheck.data || false;
      const hasModerator = moderatorCheck.data || false;

      if (!hasAdmin && !hasModerator) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsAdmin(hasAdmin);
      setIsModerator(hasModerator);
    } catch (error: any) {
      console.error('Error checking roles:', error);
      toast({
        title: "Error",
        description: "Failed to verify access.",
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setCheckingRole(false);
    }
  };

  if (loading || checkingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin && !isModerator) {
    return null;
  }

  const dashboardTitle = isAdmin ? "Admin Dashboard" : "Moderator Dashboard";
  const dashboardDescription = isAdmin 
    ? "Manage users, content, and view analytics" 
    : "Moderate content and portfolios";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{dashboardTitle}</h1>
          <p className="text-muted-foreground">{dashboardDescription}</p>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-border pb-4">
          {isAdmin && (
            <Button
              variant={currentSection === 'users' ? "default" : "outline"}
              onClick={() => navigate('/admin#users')}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Users
            </Button>
          )}
          <Button
            variant={currentSection === 'content' ? "default" : "outline"}
            onClick={() => navigate('/admin#content')}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Content
          </Button>
          {isAdmin && (
            <Button
              variant={currentSection === 'analytics' ? "default" : "outline"}
              onClick={() => navigate('/admin#analytics')}
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Button>
          )}
          {isAdmin && (
            <Button
              variant={currentSection === 'enhanced-analytics' ? "default" : "outline"}
              onClick={() => navigate('/admin#enhanced-analytics')}
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Enhanced Analytics
            </Button>
          )}
          {isAdmin && (
            <Button
              variant={currentSection === 'refunds' ? "default" : "outline"}
              onClick={() => navigate('/admin#refunds')}
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Refunds
            </Button>
          )}
        </div>

        {/* Users Section (Admin only) */}
        {isAdmin && currentSection === 'users' && (
          <div className="mt-6">
            <UserManagement />
          </div>
        )}

        {/* Content Section */}
        {currentSection === 'content' && (
          <div className="mt-6">
            <ContentModeration />
          </div>
        )}

        {/* Analytics Section (Admin only) */}
        {isAdmin && currentSection === 'analytics' && (
          <div className="mt-6">
            <Analytics />
          </div>
        )}

        {/* Enhanced Analytics Section (Admin only) */}
        {isAdmin && currentSection === 'enhanced-analytics' && (
          <div className="mt-6">
            <EnhancedAnalytics />
          </div>
        )}

        {/* Refund Management Section (Admin only) */}
        {isAdmin && currentSection === 'refunds' && (
          <div className="mt-6">
            <RefundManagement />
          </div>
        )}
      </div>
    </div>
  );
}