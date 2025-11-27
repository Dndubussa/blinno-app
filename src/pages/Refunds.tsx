import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, DollarSign, Clock, CheckCircle, XCircle, AlertCircle, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Refunds() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [refundForm, setRefundForm] = useState({
    orderId: "",
    reason: "",
    amount: "",
  });

  useEffect(() => {
    if (user) {
      fetchRefunds();
      fetchOrders();
    } else {
      navigate("/auth");
    }
  }, [user]);

  const fetchRefunds = async () => {
    try {
      const data = await api.getMyRefunds();
      setRefunds(data || []);
    } catch (error: any) {
      console.error("Error fetching refunds:", error);
      toast({
        title: "Error",
        description: "Failed to load refunds",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const data = await api.getOrders({ status: "delivered" });
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  const handleRequestRefund = async () => {
    if (!refundForm.orderId || !refundForm.reason) {
      toast({
        title: "Missing information",
        description: "Please select an order and provide a reason",
        variant: "destructive",
      });
      return;
    }

    try {
      await api.requestRefund({
        orderId: refundForm.orderId,
        reason: refundForm.reason,
        amount: refundForm.amount ? parseFloat(refundForm.amount) : undefined,
      });

      toast({
        title: "Refund requested",
        description: "Your refund request has been submitted",
      });

      setShowRequestDialog(false);
      setRefundForm({ orderId: "", reason: "", amount: "" });
      await fetchRefunds();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to request refund",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "processing":
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "rejected":
        return "destructive";
      case "processing":
        return "secondary";
      default:
        return "outline";
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-16 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading refunds...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const pendingRefunds = refunds.filter((r) => r.status === "pending");
  const approvedRefunds = refunds.filter((r) => r.status === "approved" || r.status === "processing");
  const completedRefunds = refunds.filter((r) => r.status === "completed");
  const rejectedRefunds = refunds.filter((r) => r.status === "rejected");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <Button
                variant="ghost"
                onClick={() => navigate(-1)}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-4xl font-bold mb-2">Refunds</h1>
              <p className="text-muted-foreground">
                Request and track your refunds
              </p>
            </div>
            <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Request Refund
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request a Refund</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="order">Select Order</Label>
                    <Select
                      value={refundForm.orderId}
                      onValueChange={(value) => {
                        setRefundForm({ ...refundForm, orderId: value });
                        const order = orders.find((o) => o.id === value);
                        setSelectedOrder(order);
                        if (order) {
                          setRefundForm((prev) => ({
                            ...prev,
                            amount: order.total_amount,
                          }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an order" />
                      </SelectTrigger>
                      <SelectContent>
                        {orders.map((order) => (
                          <SelectItem key={order.id} value={order.id}>
                            Order #{order.id.slice(0, 8)} - {formatPrice(parseFloat(order.total_amount))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedOrder && (
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium">Order Details</p>
                      <p className="text-sm text-muted-foreground">
                        Total: {formatPrice(parseFloat(selectedOrder.total_amount))}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Date: {new Date(selectedOrder.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="amount">Refund Amount (optional)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={refundForm.amount}
                      onChange={(e) =>
                        setRefundForm({ ...refundForm, amount: e.target.value })
                      }
                      placeholder="Leave empty for full refund"
                    />
                  </div>

                  <div>
                    <Label htmlFor="reason">Reason for Refund</Label>
                    <Textarea
                      id="reason"
                      value={refundForm.reason}
                      onChange={(e) =>
                        setRefundForm({ ...refundForm, reason: e.target.value })
                      }
                      placeholder="Please explain why you need a refund..."
                      rows={4}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowRequestDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleRequestRefund}>
                      Submit Request
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All ({refunds.length})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({pendingRefunds.length})</TabsTrigger>
              <TabsTrigger value="approved">Approved ({approvedRefunds.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completedRefunds.length})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({rejectedRefunds.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <RefundList
                refunds={refunds}
                formatPrice={formatPrice}
                getStatusIcon={getStatusIcon}
                getStatusColor={getStatusColor}
              />
            </TabsContent>
            <TabsContent value="pending" className="mt-6">
              <RefundList
                refunds={pendingRefunds}
                formatPrice={formatPrice}
                getStatusIcon={getStatusIcon}
                getStatusColor={getStatusColor}
              />
            </TabsContent>
            <TabsContent value="approved" className="mt-6">
              <RefundList
                refunds={approvedRefunds}
                formatPrice={formatPrice}
                getStatusIcon={getStatusIcon}
                getStatusColor={getStatusColor}
              />
            </TabsContent>
            <TabsContent value="completed" className="mt-6">
              <RefundList
                refunds={completedRefunds}
                formatPrice={formatPrice}
                getStatusIcon={getStatusIcon}
                getStatusColor={getStatusColor}
              />
            </TabsContent>
            <TabsContent value="rejected" className="mt-6">
              <RefundList
                refunds={rejectedRefunds}
                formatPrice={formatPrice}
                getStatusIcon={getStatusIcon}
                getStatusColor={getStatusColor}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function RefundList({ refunds, formatPrice, getStatusIcon, getStatusColor }: any) {
  if (refunds.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No refunds found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {refunds.map((refund: any) => (
        <Card key={refund.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  {getStatusIcon(refund.status)}
                  <div>
                    <h3 className="font-semibold">Refund #{refund.id.slice(0, 8)}</h3>
                    <p className="text-sm text-muted-foreground">
                      Order #{refund.order_id.slice(0, 8)}
                    </p>
                  </div>
                  <Badge variant={getStatusColor(refund.status) as any}>
                    {refund.status.charAt(0).toUpperCase() + refund.status.slice(1)}
                  </Badge>
                </div>

                <div className="mb-3">
                  <p className="text-sm font-medium mb-1">Amount</p>
                  <p className="text-lg font-semibold">
                    {formatPrice(parseFloat(refund.amount))}
                  </p>
                </div>

                <div className="mb-3">
                  <p className="text-sm font-medium mb-1">Reason</p>
                  <p className="text-sm text-muted-foreground">{refund.reason}</p>
                </div>

                {refund.admin_notes && (
                  <div className="mb-3">
                    <p className="text-sm font-medium mb-1">Admin Notes</p>
                    <p className="text-sm text-muted-foreground">{refund.admin_notes}</p>
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    Requested {formatDistanceToNow(new Date(refund.created_at), { addSuffix: true })}
                  </span>
                  {refund.processed_at && (
                    <span>
                      Processed {formatDistanceToNow(new Date(refund.processed_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

