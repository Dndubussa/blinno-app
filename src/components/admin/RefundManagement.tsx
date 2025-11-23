import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Clock, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface Refund {
  id: string;
  order_id: string;
  user_id: string;
  creator_id: string;
  amount: number;
  currency: string;
  reason: string;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected';
  admin_notes: string | null;
  processed_by: string | null;
  processed_at: string | null;
  created_at: string;
  buyer_name: string;
  order_total: number;
}

export function RefundManagement() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRefunds();
  }, []);

  const fetchRefunds = async () => {
    try {
      const response = await api.getRefunds();
      setRefunds(response);
    } catch (error: any) {
      console.error('Failed to fetch refunds:', error);
      toast({
        title: "Error",
        description: "Failed to load refunds",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'processing': return 'secondary';
      case 'approved': return 'outline';
      case 'pending': return 'outline';
      case 'rejected': return 'destructive';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending Approval';
      case 'approved': return 'Approved';
      case 'processing': return 'Processing';
      case 'completed': return 'Completed';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  const handleApproveRefund = async (refundId: string) => {
    try {
      await api.approveRefund(refundId, 'Approved by admin');
      
      toast({
        title: "Success",
        description: "Refund approved successfully",
      });
      
      fetchRefunds();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve refund",
        variant: "destructive",
      });
    }
  };

  const handleProcessRefund = async (refundId: string) => {
    try {
      await api.processRefund(refundId, { notes: 'Processing initiated by admin' });
      
      toast({
        title: "Success",
        description: "Refund processing initiated",
      });
      
      fetchRefunds();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process refund",
        variant: "destructive",
      });
    }
  };

  const handleCompleteRefund = async (refundId: string) => {
    try {
      await api.completeRefund(refundId, { 
        paymentReference: 'REFUND-' + Date.now(),
        notes: 'Refund completed by admin' 
      });
      
      toast({
        title: "Success",
        description: "Refund completed successfully",
      });
      
      fetchRefunds();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete refund",
        variant: "destructive",
      });
    }
  };

  const handleRejectRefund = async (refundId: string) => {
    try {
      await api.rejectRefund(refundId, 'Rejected by admin');
      
      toast({
        title: "Success",
        description: "Refund rejected",
      });
      
      fetchRefunds();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject refund",
        variant: "destructive",
      });
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Refund Management</CardTitle>
        <CardDescription>Manage and process refund requests</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Buyer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {refunds.map((refund) => (
              <TableRow key={refund.id}>
                <TableCell className="font-medium">#{refund.order_id.slice(0, 8)}</TableCell>
                <TableCell>{refund.buyer_name}</TableCell>
                <TableCell>TZS {parseFloat(refund.amount.toString()).toLocaleString()}</TableCell>
                <TableCell className="max-w-xs truncate">{refund.reason}</TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(refund.status)}>
                    {getStatusText(refund.status)}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(refund.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {refund.status === 'pending' && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleApproveRefund(refund.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleRejectRefund(refund.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    
                    {refund.status === 'approved' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleProcessRefund(refund.id)}
                      >
                        <CreditCard className="h-4 w-4 mr-1" />
                        Process
                      </Button>
                    )}
                    
                    {refund.status === 'processing' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleCompleteRefund(refund.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}