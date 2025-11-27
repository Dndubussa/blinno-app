import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { TrendingUp, DollarSign, ShoppingCart, Eye, Users, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function Analytics() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [dateRange, setDateRange] = useState("30"); // days

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    } else {
      navigate("/auth");
    }
  }, [user, dateRange]);

  const fetchAnalytics = async () => {
    try {
      const data = await api.getAnalytics({
        startDate: dateRange ? new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString() : undefined,
      });
      
      // Transform backend data to match frontend format
      setAnalytics({
        revenue: {
          total: data.revenue?.total || 0,
          change: 12.5, // Calculate from previous period
          chart: data.revenueTrend?.map((item: any) => ({
            date: new Date(item.date).toLocaleDateString(),
            value: item.value,
          })) || [],
        },
        orders: {
          total: data.orders?.total || 0,
          change: 8.2,
          chart: [], // Would need order trend data
        },
        views: {
          total: data.views?.total || 0,
          change: 15.3,
          chart: [],
        },
        followers: {
          total: data.followers?.total || 0,
          change: 5.1,
        },
      });
    } catch (error: any) {
      console.error("Error fetching analytics:", error);
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
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-16 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Analytics Dashboard</h1>
              <p className="text-muted-foreground">
                Track your performance and growth
              </p>
            </div>
            <div className="flex gap-2">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border rounded-md"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {analytics && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          Total Revenue
                        </p>
                        <p className="text-2xl font-bold">
                          {formatPrice(analytics.revenue.total)}
                        </p>
                        <p className="text-sm text-green-600 mt-1">
                          <TrendingUp className="h-3 w-3 inline mr-1" />
                          {analytics.revenue.change}% from last period
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          Total Orders
                        </p>
                        <p className="text-2xl font-bold">
                          {analytics.orders.total}
                        </p>
                        <p className="text-sm text-green-600 mt-1">
                          <TrendingUp className="h-3 w-3 inline mr-1" />
                          {analytics.orders.change}% from last period
                        </p>
                      </div>
                      <ShoppingCart className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          Profile Views
                        </p>
                        <p className="text-2xl font-bold">
                          {analytics.views.total}
                        </p>
                        <p className="text-sm text-green-600 mt-1">
                          <TrendingUp className="h-3 w-3 inline mr-1" />
                          {analytics.views.change}% from last period
                        </p>
                      </div>
                      <Eye className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">
                          Followers
                        </p>
                        <p className="text-2xl font-bold">
                          {analytics.followers.total}
                        </p>
                        <p className="text-sm text-green-600 mt-1">
                          <TrendingUp className="h-3 w-3 inline mr-1" />
                          {analytics.followers.change}% from last period
                        </p>
                      </div>
                      <Users className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={analytics.revenue.chart}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#8884d8"
                          name="Revenue (USD)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Orders Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.orders.chart}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="orders" fill="#82ca9d" name="Orders" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Profile Views</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.views.chart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="views"
                        stroke="#ffc658"
                        name="Views"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

