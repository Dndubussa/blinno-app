import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, FileText, DollarSign, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Stats {
  totalUsers: number;
  totalCreators: number;
  totalPortfolios: number;
  totalBookings: number;
  totalRevenue: number;
}

export function Analytics() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalCreators: 0,
    totalPortfolios: 0,
    totalBookings: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [
        { count: usersCount },
        { count: creatorsCount },
        { count: portfoliosCount },
        { count: bookingsCount },
        { data: bookingsData },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_creator', true),
        supabase.from('portfolios').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('*', { count: 'exact', head: true }),
        supabase.from('bookings').select('total_amount'),
      ]);

      const totalRevenue = bookingsData?.reduce((sum, booking) => sum + (booking.total_amount || 0), 0) || 0;

      setStats({
        totalUsers: usersCount || 0,
        totalCreators: creatorsCount || 0,
        totalPortfolios: portfoliosCount || 0,
        totalBookings: bookingsCount || 0,
        totalRevenue,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      description: "Registered users",
    },
    {
      title: "Total Creators",
      value: stats.totalCreators,
      icon: Users,
      description: "Active creators",
    },
    {
      title: "Total Portfolios",
      value: stats.totalPortfolios,
      icon: FileText,
      description: "Published portfolios",
    },
    {
      title: "Total Bookings",
      value: stats.totalBookings,
      icon: Calendar,
      description: "All bookings",
    },
    {
      title: "Total Revenue",
      value: `USD ${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      description: "Platform revenue",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
