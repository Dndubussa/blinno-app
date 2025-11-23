import { useEffect, useState } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Bell, BellOff, Settings, CheckCircle, Trash2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<any>(null);
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchPreferences();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    } else {
      navigate("/auth");
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const data = await api.getNotifications({ limit: 100, unreadOnly: false });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const data = await api.getNotificationPreferences();
      setPreferences(data);
    } catch (error) {
      console.error("Error fetching preferences:", error);
    }
  };

  const handleMarkRead = async (notificationId: string) => {
    try {
      await api.markNotificationRead(notificationId);
      await fetchNotifications();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      await fetchNotifications();
      toast({
        title: "All marked as read",
        description: "All notifications have been marked as read",
      });
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await api.deleteNotification(notificationId);
      await fetchNotifications();
      toast({
        title: "Notification deleted",
      });
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.is_read) {
      await handleMarkRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.data?.order_id) {
      navigate(`/orders`);
    } else if (notification.data?.booking_id) {
      navigate(`/dashboard?booking=${notification.data.booking_id}`);
    } else if (notification.data?.message_id) {
      navigate("/messages");
    } else if (notification.data?.dispute_id) {
      navigate(`/disputes`);
    } else if (notification.data?.refund_id) {
      navigate(`/refunds`);
    }
  };

  const handleUpdatePreferences = async (updates: any) => {
    try {
      const updated = { ...preferences, ...updates };
      await api.updateNotificationPreferences(updated);
      setPreferences(updated);
      toast({
        title: "Preferences updated",
        description: "Your notification preferences have been saved",
      });
    } catch (error) {
      console.error("Error updating preferences:", error);
      toast({
        title: "Error",
        description: "Failed to update preferences",
        variant: "destructive",
      });
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <SidebarProvider defaultOpen={true}>
        <DashboardSidebar />
        <SidebarInset>
          <div className="min-h-screen bg-background">
            <div className="flex items-center gap-4 border-b border-border px-4 py-4">
              <SidebarTrigger />
              <h1 className="text-3xl font-bold">Notifications</h1>
            </div>
            <div className="pt-8 pb-16 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading notifications...</p>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const unreadNotifications = notifications.filter((n) => !n.is_read);
  const readNotifications = notifications.filter((n) => n.is_read);

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-background">
          <div className="flex items-center gap-4 border-b border-border px-4 py-4">
            <SidebarTrigger />
            <h1 className="text-3xl font-bold">Notifications</h1>
          </div>
          <div className="pt-8 pb-16">
            <div className="container mx-auto px-4 max-w-4xl">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground">
                    {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : "All caught up!"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {unreadCount > 0 && (
                    <Button variant="outline" onClick={handleMarkAllRead}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark All Read
                    </Button>
                  )}
                  <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Settings className="h-4 w-4 mr-2" />
                        Preferences
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Notification Preferences</DialogTitle>
                      </DialogHeader>
                      {preferences && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="email">Email Notifications</Label>
                            <Switch
                              id="email"
                              checked={preferences.email_enabled}
                              onCheckedChange={(checked) =>
                                handleUpdatePreferences({ email_enabled: checked })
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="sms">SMS Notifications</Label>
                            <Switch
                              id="sms"
                              checked={preferences.sms_enabled}
                              onCheckedChange={(checked) =>
                                handleUpdatePreferences({ sms_enabled: checked })
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="push">Push Notifications</Label>
                            <Switch
                              id="push"
                              checked={preferences.push_enabled}
                              onCheckedChange={(checked) =>
                                handleUpdatePreferences({ push_enabled: checked })
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="inapp">In-App Notifications</Label>
                            <Switch
                              id="inapp"
                              checked={preferences.in_app_enabled}
                              onCheckedChange={(checked) =>
                                handleUpdatePreferences({ in_app_enabled: checked })
                              }
                            />
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <Tabs defaultValue="all" className="w-full">
                <TabsList>
                  <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
                  <TabsTrigger value="unread">Unread ({unreadNotifications.length})</TabsTrigger>
                  <TabsTrigger value="read">Read ({readNotifications.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-6">
                  <NotificationList
                    notifications={notifications}
                    onMarkRead={handleMarkRead}
                    onDelete={handleDelete}
                    onClick={handleNotificationClick}
                  />
                </TabsContent>
                <TabsContent value="unread" className="mt-6">
                  <NotificationList
                    notifications={unreadNotifications}
                    onMarkRead={handleMarkRead}
                    onDelete={handleDelete}
                    onClick={handleNotificationClick}
                  />
                </TabsContent>
                <TabsContent value="read" className="mt-6">
                  <NotificationList
                    notifications={readNotifications}
                    onMarkRead={handleMarkRead}
                    onDelete={handleDelete}
                    onClick={handleNotificationClick}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function NotificationList({ notifications, onMarkRead, onDelete, onClick }: any) {
  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <BellOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No notifications</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {notifications.map((notification: any) => (
        <Card
          key={notification.id}
          className={`hover:shadow-md transition-shadow cursor-pointer ${
            !notification.is_read ? "bg-accent/50 border-primary/20" : ""
          }`}
          onClick={() => onClick(notification)}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium">{notification.title}</p>
                  {!notification.is_read && (
                    <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {notification.message}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>
              <div className="flex gap-2">
                {!notification.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkRead(notification.id);
                    }}
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(notification.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
