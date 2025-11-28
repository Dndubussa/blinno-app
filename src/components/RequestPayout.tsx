import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { useTranslation } from "react-i18next";

interface PayoutMethod {
  id: string;
  method_type: 'mobile_money' | 'bank_transfer';
  is_default: boolean;
  mobile_operator?: string;
  mobile_number?: string;
  bank_name?: string;
  account_name?: string;
  account_number?: string;
}

interface EarningsSummary {
  totalEarnings: number;
  pendingEarnings: number;
  paidOut: number;
  pendingCount: number;
  paidCount: number;
  byType: Array<{ transaction_type: string; earnings: number; count: number }>;
  payoutHistory: any[];
  totalTransactions?: number;
}

export function RequestPayout() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [methods, setMethods] = useState<PayoutMethod[]>([]);
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');

  useEffect(() => {
    Promise.all([
      fetchPayoutMethods(),
      fetchEarnings()
    ]).finally(() => setLoading(false));
  }, []);

  const fetchPayoutMethods = async () => {
    try {
      const data = await api.getPayoutMethods();
      setMethods(data);
      if (data.length > 0) {
        // Select the default method if available
        const defaultMethod = data.find(method => method.is_default);
        if (defaultMethod) {
          setSelectedMethod(defaultMethod.id);
        } else {
          setSelectedMethod(data[0].id);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load payout methods",
        variant: "destructive",
      });
    }
  };

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
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !selectedMethod) {
      toast({
        title: "Error",
        description: "Please enter an amount and select a payout method",
        variant: "destructive",
      });
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (!earnings || amountValue > earnings.pendingEarnings) {
      toast({
        title: "Error",
        description: "Amount exceeds available earnings",
        variant: "destructive",
      });
      return;
    }

    // Check minimum payout amount (25 USD)
    if (amountValue < 25) {
      toast({
        title: "Error",
        description: "Minimum payout amount is 25 USD",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    
    try {
      await api.createPayoutRequest({
        methodId: selectedMethod,
        amount: amountValue,
        currency: 'USD'
      });
      
      toast({
        title: "Success",
        description: "Payout request submitted successfully",
      });
      
      // Reset form and refresh data
      setAmount('');
      fetchEarnings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit payout request",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const selectedMethodInfo = methods.find(method => method.id === selectedMethod);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Request Payout</CardTitle>
          <CardDescription>
            Transfer your earnings to your preferred payment method
          </CardDescription>
        </CardHeader>
        <CardContent>
          {earnings && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="border rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Total Earnings</div>
                <div className="text-2xl font-bold">USD {earnings.totalEarnings.toLocaleString()}</div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Available for Payout</div>
                <div className="text-2xl font-bold text-green-600">USD {earnings.pendingEarnings.toLocaleString()}</div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Already Paid Out</div>
                <div className="text-2xl font-bold">USD {earnings.paidOut.toLocaleString()}</div>
              </div>
            </div>
          )}

          {earnings && earnings.pendingEarnings > 0 ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (USD)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    min="25"
                    max={earnings?.pendingEarnings}
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Minimum payout: USD 25
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="method">Payout Method</Label>
                  <select
                    id="method"
                    value={selectedMethod}
                    onChange={(e) => setSelectedMethod(e.target.value)}
                    className="w-full p-2 border rounded-md"
                    required
                  >
                    {methods.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.method_type === 'mobile_money' 
                          ? `${method.mobile_operator} - ${method.mobile_number}`
                          : `${method.bank_name} - ${method.account_number}`
                        }
                        {method.is_default && ' (Default)'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedMethodInfo && (
                <div className="border rounded-lg p-4 bg-muted">
                  <h4 className="font-medium mb-2">Payout Method Details</h4>
                  <div className="text-sm space-y-1">
                    {selectedMethodInfo.method_type === 'mobile_money' ? (
                      <>
                        <div><span className="font-medium">Type:</span> Mobile Money</div>
                        <div><span className="font-medium">Operator:</span> {selectedMethodInfo.mobile_operator}</div>
                        <div><span className="font-medium">Number:</span> {selectedMethodInfo.mobile_number}</div>
                      </>
                    ) : (
                      <>
                        <div><span className="font-medium">Type:</span> Bank Transfer</div>
                        <div><span className="font-medium">Bank:</span> {selectedMethodInfo.bank_name}</div>
                        <div><span className="font-medium">Account Name:</span> {selectedMethodInfo.account_name}</div>
                        <div><span className="font-medium">Account Number:</span> {selectedMethodInfo.account_number}</div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <Button type="submit" disabled={processing} className="w-full">
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("common.processing")}
                  </>
                ) : (
                  'Request Payout'
                )}
              </Button>
            </form>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                You don't have any earnings available for payout at this time.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Your earnings will be available for payout once payments are processed.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}