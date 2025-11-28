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
import { Package, Truck, CheckCircle, XCircle, Clock, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiCurrencyPrice } from "@/components/MultiCurrencyPrice";
import { useTranslation } from "react-i18next";

export default function Orders() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showTrackingDialog, setShowTrackingDialog] = useState(false);
  const [trackingData, setTrackingData] = useState({
    trackingNumber: "",
    shippingCarrier: "",
    estimatedDeliveryDate: "",
  });

  useEffect(() => {
    if (user) {
      fetchOrders();
    } else {
      navigate("/auth");
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      const data = await api.getOrders();
      setOrders(data || []);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      toast({
        title: t("common.error"),
        description: t("orders.failedToLoad"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "cancelled":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "shipped":
        return <Truck className="h-5 w-5 text-blue-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "default";
      case "cancelled":
        return "destructive";
      case "shipped":
        return "secondary";
      default:
        return "outline";
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm(t("orders.confirmCancel"))) return;

    try {
      await api.cancelOrder(orderId, t("orders.cancelledByBuyer"));
      toast({
        title: t("orders.orderCancelled"),
        description: t("orders.orderCancelledDesc"),
      });
      await fetchOrders();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || t("orders.failedToCancel"),
        variant: "destructive",
      });
    }
  };

  const handleConfirmDelivery = async (orderId: string) => {
    try {
      await api.confirmDelivery(orderId);
      toast({
        title: t("orders.deliveryConfirmed"),
        description: t("orders.thankYouForConfirming"),
      });
      await fetchOrders();
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || t("orders.failedToConfirmDelivery"),
        variant: "destructive",
      });
    }
  };

  // Keep formatPrice for backward compatibility in OrderList component
  // But use MultiCurrencyPrice in the actual display
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-16 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t("orders.loading")}</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const pendingOrders = orders.filter((o) => ["pending", "confirmed"].includes(o.status));
  const activeOrders = orders.filter((o) => o.status === "shipped");
  const completedOrders = orders.filter((o) => o.status === "delivered");
  const cancelledOrders = orders.filter((o) => o.status === "cancelled");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">{t("orders.title")}</h1>
            <p className="text-muted-foreground">
              {t("orders.trackAndManage")}
            </p>
          </div>

          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">{t("orders.all")} ({orders.length})</TabsTrigger>
              <TabsTrigger value="pending">{t("orders.status.pending")} ({pendingOrders.length})</TabsTrigger>
              <TabsTrigger value="active">{t("orders.active")} ({activeOrders.length})</TabsTrigger>
              <TabsTrigger value="completed">{t("orders.completed")} ({completedOrders.length})</TabsTrigger>
              <TabsTrigger value="cancelled">{t("orders.status.cancelled")} ({cancelledOrders.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <OrderList orders={orders} onView={setSelectedOrder} onCancel={handleCancelOrder} onConfirmDelivery={handleConfirmDelivery} formatPrice={formatPrice} getStatusIcon={getStatusIcon} getStatusColor={getStatusColor} />
            </TabsContent>
            <TabsContent value="pending" className="mt-6">
              <OrderList orders={pendingOrders} onView={setSelectedOrder} onCancel={handleCancelOrder} onConfirmDelivery={handleConfirmDelivery} formatPrice={formatPrice} getStatusIcon={getStatusIcon} getStatusColor={getStatusColor} />
            </TabsContent>
            <TabsContent value="active" className="mt-6">
              <OrderList orders={activeOrders} onView={setSelectedOrder} onCancel={handleCancelOrder} onConfirmDelivery={handleConfirmDelivery} formatPrice={formatPrice} getStatusIcon={getStatusIcon} getStatusColor={getStatusColor} />
            </TabsContent>
            <TabsContent value="completed" className="mt-6">
              <OrderList orders={completedOrders} onView={setSelectedOrder} onCancel={handleCancelOrder} onConfirmDelivery={handleConfirmDelivery} formatPrice={formatPrice} getStatusIcon={getStatusIcon} getStatusColor={getStatusColor} />
            </TabsContent>
            <TabsContent value="cancelled" className="mt-6">
              <OrderList orders={cancelledOrders} onView={setSelectedOrder} onCancel={handleCancelOrder} onConfirmDelivery={handleConfirmDelivery} formatPrice={formatPrice} getStatusIcon={getStatusIcon} getStatusColor={getStatusColor} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Order Details Dialog */}
      {selectedOrder && (
        <OrderDetailsDialog
          order={selectedOrder}
          open={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onConfirmDelivery={handleConfirmDelivery}
          formatPrice={formatPrice}
        />
      )}

      <Footer />
    </div>
  );
}

function OrderList({ orders, onView, onCancel, onConfirmDelivery, formatPrice, getStatusIcon, getStatusColor }: any) {
  const { t } = useTranslation();
  
  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">{t("orders.empty")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order: any) => (
        <Card key={order.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  {getStatusIcon(order.status)}
                  <div>
                    <h3 className="font-semibold">{t("orders.orderNumber")} {order.id.slice(0, 8)}</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Badge variant={getStatusColor(order.status) as any}>
                    {t(`orders.status.${order.status}`)}
                  </Badge>
                </div>

                {order.items && order.items.length > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-medium mb-1">{t("orders.items")}:</p>
                    <div className="space-y-1">
                      {order.items.slice(0, 3).map((item: any, idx: number) => (
                        <p key={idx} className="text-sm text-muted-foreground">
                          {item.product_title} × {item.quantity}
                        </p>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-sm text-muted-foreground">
                          +{order.items.length - 3} {t("orders.moreItems")}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm">
                  <div className="font-semibold">
                    <MultiCurrencyPrice usdPrice={parseFloat(order.total_amount)} size="sm" />
                  </div>
                  {order.tracking_number && (
                    <span className="text-muted-foreground">
                      {t("orders.tracking")}: {order.tracking_number}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onView(order)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {t("common.view")}
                </Button>
                {order.status === "pending" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onCancel(order.id)}
                  >
                    {t("common.cancel")}
                  </Button>
                )}
                {order.status === "shipped" && (
                  <Button
                    size="sm"
                    onClick={() => onConfirmDelivery(order.id)}
                  >
                    {t("orders.confirmDelivery")}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function OrderDetailsDialog({ order, open, onClose, onConfirmDelivery, formatPrice }: any) {
  const { t } = useTranslation();
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && order) {
      fetchOrderDetails();
    }
  }, [open, order]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      const details = await api.getOrderDetails(order.id);
      setOrderDetails(details);
    } catch (error) {
      console.error("Error fetching order details:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("orders.viewDetails")}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="text-center py-8">{t("common.loading")}</div>
        ) : orderDetails ? (
          <div className="space-y-6">
            {/* Order Info */}
            <div>
              <h3 className="font-semibold mb-2">{t("orders.orderInformation")}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">{t("orders.orderId")}</p>
                  <p className="font-medium">{orderDetails.id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("common.status")}</p>
                  <p className="font-medium">{t(`orders.status.${orderDetails.status}`)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("orders.totalAmount")}</p>
                  <div className="font-medium">
                    <MultiCurrencyPrice usdPrice={parseFloat(orderDetails.total_amount)} size="md" />
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("orders.orderDate")}</p>
                  <p className="font-medium">
                    {new Date(orderDetails.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Status History */}
            {orderDetails.statusHistory && orderDetails.statusHistory.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">{t("orders.statusHistory")}</h3>
                <div className="space-y-2">
                  {orderDetails.statusHistory.map((status: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 text-sm">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <div className="flex-1">
                        <p className="font-medium">{t(`orders.status.${status.status}`)}</p>
                        <p className="text-muted-foreground text-xs">
                          {new Date(status.created_at).toLocaleString()}
                          {status.changed_by_name && ` ${t("orders.by")} ${status.changed_by_name}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Items */}
            {orderDetails.items && orderDetails.items.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">{t("orders.items")}</h3>
                <div className="space-y-2">
                  {orderDetails.items.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-4 p-3 border rounded">
                      {item.product_image && (
                        <img
                          src={item.product_image}
                          alt={item.product_title}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{item.product_title}</p>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <span>{t("common.quantity")}: {item.quantity} ×</span>
                          <MultiCurrencyPrice usdPrice={parseFloat(item.price_at_purchase)} size="sm" />
                        </div>
                      </div>
                      <div className="font-medium">
                        <MultiCurrencyPrice usdPrice={parseFloat(item.price_at_purchase) * item.quantity} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tracking Info */}
            {orderDetails.tracking_number && (
              <div>
                <h3 className="font-semibold mb-2">{t("orders.trackingInformation")}</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t("orders.trackingNumber")}</p>
                    <p className="font-medium">{orderDetails.tracking_number}</p>
                  </div>
                  {orderDetails.shipping_carrier && (
                    <div>
                      <p className="text-muted-foreground">{t("orders.carrier")}</p>
                      <p className="font-medium">{orderDetails.shipping_carrier}</p>
                    </div>
                  )}
                  {orderDetails.estimated_delivery_date && (
                    <div>
                      <p className="text-muted-foreground">{t("orders.estimatedDelivery")}</p>
                      <p className="font-medium">
                        {new Date(orderDetails.estimated_delivery_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            {orderDetails.status === "shipped" && (
              <div className="pt-4 border-t">
                <Button
                  onClick={() => {
                    onConfirmDelivery(orderDetails.id);
                    onClose();
                  }}
                  className="w-full"
                >
                  {t("orders.confirmDelivery")}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">{t("orders.failedToLoadDetails")}</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

