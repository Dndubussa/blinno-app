import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      const data = await api.getNotifications({ limit: 20, unreadOnly: false });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
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

  const handleNotificationClick = async (notification: any) => {
    if (!notification.is_read) {
      await handleMarkRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.data?.order_id) {
      navigate(`/orders/${notification.data.order_id}`);
    } else if (notification.data?.booking_id) {
      navigate(`/dashboard?booking=${notification.data.booking_id}`);
    } else if (notification.data?.message_id) {
      navigate("/messages");
    } else if (notification.data?.dispute_id) {
      navigate(`/disputes/${notification.data.dispute_id}`);
    }

    setOpen(false);
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      await fetchNotifications();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-xs"
            >
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No notifications
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 cursor-pointer hover:bg-accent transition-colors ${
                    !notification.is_read ? "bg-accent/50" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{notification.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => {
              navigate("/notifications");
              setOpen(false);
            }}
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

