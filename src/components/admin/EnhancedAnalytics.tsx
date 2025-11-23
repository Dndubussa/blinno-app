import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, FileText, DollarSign, Calendar, TrendingUp, Package, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface RevenueSummary {
  total_revenue: number;
  total_platform_fees: number;
  total_processing_fees: number;
  total_payouts: number;
  transaction_count: number;
}

interface RevenueByType {
  transaction_type: string;
  count: number;
  revenue: number;
  fees: number;
}

interface SubscriptionData {
  active_subscriptions: number;
  monthly_recurring_revenue: number;
}

interface FeaturedListingsData {
  active_listings: number;
  total_revenue: number;
}

interface AnalyticsData {
  summary: RevenueSummary;
  byType: RevenueByType[];
  subscriptions: SubscriptionData;
  featuredListings: FeaturedListingsData;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function EnhancedAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await api.getRevenueSummary();
      setAnalytics(response);
    } catch (error: any) {
      console.error('Failed to fetch analytics:', error);
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

  if (!analytics) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No analytics data available</p>
        </CardContent>
      </Card>
    );
  }

  const statCards = [
    {
      title: "Total Revenue",
      value: `TZS ${parseFloat(analytics.summary.total_revenue.toString()).toLocaleString()}`,
      icon: DollarSign,
      description: "Platform gross revenue",
    },
    {
      title: "Platform Fees",
      value: `TZS ${parseFloat(analytics.summary.total_platform_fees.toString()).toLocaleString()}`,
      icon: TrendingUp,
      description: "Total platform fees collected",
    },
    {
      title: "Processing Fees",
      value: `TZS ${parseFloat(analytics.summary.total_processing_fees.toString()).toLocaleString()}`,
      icon: ShoppingCart,
      description: "Payment processing fees",
    },
    {
      title: "Creator Payouts",
      value: `TZS ${parseFloat(analytics.summary.total_payouts.toString()).toLocaleString()}`,
      icon: Package,
      description: "Total paid to creators",
    },
    {
      title: "Transactions",
      value: analytics.summary.transaction_count,
      icon: Calendar,
      description: "Total transactions processed",
    },
    {
      title: "MRR",
      value: `TZS ${parseFloat(analytics.subscriptions.monthly_recurring_revenue.toString()).toLocaleString()}`,
      icon: Users,
      description: "Monthly recurring revenue",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
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

      {/* Revenue by Type Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Transaction Type</CardTitle>
          <CardDescription>Breakdown of revenue sources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.byType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="transaction_type" />
                <YAxis />
                <Tooltip formatter={(value) => [`TZS ${parseFloat(value.toString()).toLocaleString()}`, 'Amount']} />
                <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
                <Bar dataKey="fees" fill="#82ca9d" name="Fees" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Type Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction Type Distribution</CardTitle>
          <CardDescription>Percentage of transactions by type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.byType}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="transaction_type"
                  label={({ transaction_type, count }) => `${transaction_type}: ${count}`}
                >
                  {analytics.byType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Transactions']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Subscription and Featured Listings */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Subscriptions</CardTitle>
            <CardDescription>Subscription-based revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Subscriptions</span>
                <span className="font-medium">{analytics.subscriptions.active_subscriptions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly Recurring Revenue</span>
                <span className="font-medium">
                  TZS {parseFloat(analytics.subscriptions.monthly_recurring_revenue.toString()).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Featured Listings</CardTitle>
            <CardDescription>Paid featured placement revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Listings</span>
                <span className="font-medium">{analytics.featuredListings.active_listings}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Revenue</span>
                <span className="font-medium">
                  TZS {parseFloat(analytics.featuredListings.total_revenue.toString()).toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}