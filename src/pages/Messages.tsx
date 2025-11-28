import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const recipientId = searchParams.get("recipient");
  
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(recipientId);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/signin");
      return;
    }
    fetchConversations();
    
    // Poll for new messages every 5 seconds
    const interval = setInterval(() => {
      fetchConversations();
      if (selectedConversation) {
        fetchMessages(selectedConversation);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [user, selectedConversation]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    if (!user) return;

    try {
      const data = await api.getConversations();
      setConversations(data || []);
    } catch (error: any) {
      console.error("Error fetching conversations:", error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (userId: string) => {
    if (!user) return;

    try {
      const data = await api.getMessages(userId);
      setMessages(data || []);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async () => {
    if (!user || !selectedConversation || !newMessage.trim() || sending) return;

    setSending(true);
    try {
      await api.sendMessage(selectedConversation, newMessage.trim());
      setNewMessage("");
      // Refresh messages
      await fetchMessages(selectedConversation);
      await fetchConversations();
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (!user) return null;

  return (
    <SidebarProvider defaultOpen={true}>
      <DashboardSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-background">
          <div className="flex items-center gap-4 border-b border-border px-4 py-4">
            <SidebarTrigger />
            <h1 className="text-3xl font-bold">Messages</h1>
          </div>
          <div className="flex-1 container mx-auto px-4 pt-8 pb-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
              <Card className="md:col-span-1 overflow-hidden">
                <CardContent className="p-0 h-full overflow-y-auto">
                  <div className="p-4 border-b">
                    <h2 className="font-semibold">Conversations</h2>
                  </div>
                  {loading ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : conversations.length === 0 ? (
                    <p className="text-center text-muted-foreground p-8">No conversations yet</p>
                  ) : (
                    conversations.map((conv) => (
                      <div
                        key={conv.user_id || conv.id}
                        className={`p-4 border-b cursor-pointer hover:bg-accent transition-colors ${
                          selectedConversation === (conv.user_id || conv.id) ? "bg-accent" : ""
                        }`}
                        onClick={() => setSelectedConversation(conv.user_id || conv.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={conv.avatar_url || conv.profile?.avatar_url} />
                            <AvatarFallback>
                              {(conv.display_name || conv.profile?.display_name || conv.name || "U")[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {conv.display_name || conv.profile?.display_name || conv.name || "Unknown User"}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {conv.last_message || conv.content || "No messages yet"}
                            </p>
                          </div>
                          {conv.unread_count > 0 && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="md:col-span-2 overflow-hidden flex flex-col">
                {selectedConversation ? (
                  <>
                    <CardContent className="flex-1 p-4 overflow-y-auto">
                      {loading ? (
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${
                                msg.sender_id === user.id ? "justify-end" : "justify-start"
                              }`}
                            >
                              <div
                                className={`max-w-[70%] rounded-lg p-3 ${
                                  msg.sender_id === user.id
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                }`}
                              >
                                <p className="text-sm">{msg.content}</p>
                                <p className="text-xs opacity-70 mt-1">
                                  {new Date(msg.created_at).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                    <div className="p-4 border-t">
                      <div className="flex gap-2">
                        <Input
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Type a message..."
                          onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                          disabled={sending}
                        />
                        <Button onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                          {sending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <CardContent className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Select a conversation to start messaging</p>
                  </CardContent>
                )}
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
