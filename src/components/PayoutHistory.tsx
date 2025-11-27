import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { api } from '@/lib/api';
import { format } from 'date-fns';

interface Payout {
  id: string;
  creator_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';
  payment_method: string;
  payment_reference: string;
  payout_date: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'paid': return 'default';
    case 'processing': return 'secondary';
    case 'pending': return 'outline';
    case 'failed': return 'destructive';
    case 'cancelled': return 'destructive';
    default: return 'default';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'paid': return 'Completed';
    case 'processing': return 'Processing';
    case 'pending': return 'Pending';
    case 'failed': return 'Failed';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
};

const getPaymentMethodText = (method: string) => {
  switch (method) {
    case 'mobile_money': return 'Mobile Money';
    case 'bank_transfer': return 'Bank Transfer';
    default: return method;
  }
};

export function PayoutHistory() {
  const { toast } = useToast();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayoutHistory();
  }, []);

  const fetchPayoutHistory = async () => {
    try {
      const data = await api.getMyPayouts();
      setPayouts(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load payout history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading payout history...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>
            View your payout requests and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No payout history found.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Your payout requests will appear here once submitted.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {payouts.map((payout) => (
                <div key={payout.id} className="border rounded-lg p-4">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">USD {parseFloat(payout.amount.toString()).toLocaleString()}</h3>
                        <Badge variant={getStatusBadgeVariant(payout.status)}>
                          {getStatusText(payout.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {getPaymentMethodText(payout.payment_method)} • {format(new Date(payout.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      {payout.processed_at && (
                        <p className="text-sm">
                          Processed: {format(new Date(payout.processed_at), 'MMM d, yyyy')}
                        </p>
                      )}
                      {payout.payout_date && (
                        <p className="text-sm">
                          Completed: {format(new Date(payout.payout_date), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {payout.payment_reference && payout.status === 'paid' && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm">
                        <span className="font-medium">Reference:</span> {payout.payment_reference}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}