import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { api } from '@/lib/api';
import { PayoutMethods } from './PayoutMethods';
import { RequestPayout } from './RequestPayout';
import { PayoutHistory } from './PayoutHistory';
import { Wallet, TrendingUp, Clock, CheckCircle } from 'lucide-react';

interface EarningsSummary {
  totalEarnings: number;
  pendingEarnings: number;
  paidOut: number;
  pendingCount: number;
  paidCount: number;
  byType: Array<{
    transaction_type: string;
    earnings: number;
    count: number;
  }>;
}

export function EarningsDashboard() {
  const { toast } = useToast();
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    try {
      const data = await api.getEarnings();
      setEarnings(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load earnings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading earnings dashboard...</div>;
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'marketplace': return 'Marketplace Sales';
      case 'digital_product': return 'Digital Products';
      case 'service_booking': return 'Service Bookings';
      case 'commission': return 'Commissions';
      case 'subscription': return 'Subscriptions';
      case 'tip': return 'Tips';
      case 'event_booking': return 'Event Bookings';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Earnings Dashboard</h2>
        <p className="text-muted-foreground">
          Track your earnings, manage payouts, and view payment history
        </p>
      </div>

      {earnings && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">TZS {earnings.totalEarnings.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                All time earnings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">TZS {earnings.pendingEarnings.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Ready for payout
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Out</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">TZS {earnings.paidOut.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Already transferred
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{earnings.pendingCount + earnings.paidCount}</div>
              <p className="text-xs text-muted-foreground">
                Total transactions
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {earnings && earnings.byType.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Earnings by Source</CardTitle>
            <CardDescription>
              Breakdown of your earnings by transaction type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {earnings.byType.map((item) => (
                <div key={item.transaction_type} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{getTypeLabel(item.transaction_type)}</p>
                    <p className="text-sm text-muted-foreground">{item.count} transactions</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">TZS {parseFloat(item.earnings.toString()).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="payout" className="space-y-4">
        <TabsList>
          <TabsTrigger value="payout">Request Payout</TabsTrigger>
          <TabsTrigger value="methods">Payout Methods</TabsTrigger>
          <TabsTrigger value="history">Payout History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="payout" className="space-y-4">
          <RequestPayout />
        </TabsContent>
        
        <TabsContent value="methods" className="space-y-4">
          <PayoutMethods />
        </TabsContent>
        
        <TabsContent value="history" className="space-y-4">
          <PayoutHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}