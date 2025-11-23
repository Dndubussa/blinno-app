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
import { ArrowLeft, AlertTriangle, Clock, CheckCircle, XCircle, MessageSquare, Paperclip, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Disputes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [disputeForm, setDisputeForm] = useState({
    orderId: "",
    bookingId: "",
    paymentId: "",
    disputeType: "",
    respondentId: "",
    title: "",
    description: "",
  });

  useEffect(() => {
    if (user) {
      fetchDisputes();
    } else {
      navigate("/auth");
    }
  }, [user]);

  const fetchDisputes = async () => {
    try {
      const data = await api.getMyDisputes();
      setDisputes(data || []);
    } catch (error: any) {
      console.error("Error fetching disputes:", error);
      toast({
        title: "Error",
        description: "Failed to load disputes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDispute = async () => {
    if (!disputeForm.disputeType || !disputeForm.respondentId || !disputeForm.title || !disputeForm.description) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      await api.createDispute({
        orderId: disputeForm.orderId || undefined,
        bookingId: disputeForm.bookingId || undefined,
        paymentId: disputeForm.paymentId || undefined,
        disputeType: disputeForm.disputeType,
        respondentId: disputeForm.respondentId,
        title: disputeForm.title,
        description: disputeForm.description,
      });

      toast({
        title: "Dispute created",
        description: "Your dispute has been submitted",
      });

      setShowCreateDialog(false);
      setDisputeForm({
        orderId: "",
        bookingId: "",
        paymentId: "",
        disputeType: "",
        respondentId: "",
        title: "",
        description: "",
      });
      await fetchDisputes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create dispute",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "resolved":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "closed":
        return <XCircle className="h-5 w-5 text-gray-500" />;
      case "in_review":
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved":
        return "default";
      case "closed":
        return "secondary";
      case "in_review":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-16 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading disputes...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const openDisputes = disputes.filter((d) => d.status === "open");
  const inReviewDisputes = disputes.filter((d) => d.status === "in_review");
  const resolvedDisputes = disputes.filter((d) => d.status === "resolved" || d.status === "closed");

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
              <h1 className="text-4xl font-bold mb-2">Disputes</h1>
              <p className="text-muted-foreground">
                File and manage disputes with sellers
              </p>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  File Dispute
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>File a Dispute</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="disputeType">Dispute Type *</Label>
                    <Select
                      value={disputeForm.disputeType}
                      onValueChange={(value) =>
                        setDisputeForm({ ...disputeForm, disputeType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select dispute type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="order">Order Issue</SelectItem>
                        <SelectItem value="booking">Booking Issue</SelectItem>
                        <SelectItem value="payment">Payment Issue</SelectItem>
                        <SelectItem value="service_quality">Service Quality</SelectItem>
                        <SelectItem value="item_not_received">Item Not Received</SelectItem>
                        <SelectItem value="item_damaged">Item Damaged</SelectItem>
                        <SelectItem value="wrong_item">Wrong Item</SelectItem>
                        <SelectItem value="refund_not_received">Refund Not Received</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="orderId">Order ID (if applicable)</Label>
                    <Input
                      id="orderId"
                      value={disputeForm.orderId}
                      onChange={(e) =>
                        setDisputeForm({ ...disputeForm, orderId: e.target.value })
                      }
                      placeholder="Order ID"
                    />
                  </div>

                  <div>
                    <Label htmlFor="respondentId">Respondent User ID *</Label>
                    <Input
                      id="respondentId"
                      value={disputeForm.respondentId}
                      onChange={(e) =>
                        setDisputeForm({ ...disputeForm, respondentId: e.target.value })
                      }
                      placeholder="User ID of the person you're disputing with"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={disputeForm.title}
                      onChange={(e) =>
                        setDisputeForm({ ...disputeForm, title: e.target.value })
                      }
                      placeholder="Brief title for your dispute"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={disputeForm.description}
                      onChange={(e) =>
                        setDisputeForm({ ...disputeForm, description: e.target.value })
                      }
                      placeholder="Please provide a detailed description of the issue..."
                      rows={6}
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCreateDispute}>
                      Submit Dispute
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All ({disputes.length})</TabsTrigger>
              <TabsTrigger value="open">Open ({openDisputes.length})</TabsTrigger>
              <TabsTrigger value="in_review">In Review ({inReviewDisputes.length})</TabsTrigger>
              <TabsTrigger value="resolved">Resolved ({resolvedDisputes.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <DisputeList
                disputes={disputes}
                getStatusIcon={getStatusIcon}
                getStatusColor={getStatusColor}
                onView={setSelectedDispute}
              />
            </TabsContent>
            <TabsContent value="open" className="mt-6">
              <DisputeList
                disputes={openDisputes}
                getStatusIcon={getStatusIcon}
                getStatusColor={getStatusColor}
                onView={setSelectedDispute}
              />
            </TabsContent>
            <TabsContent value="in_review" className="mt-6">
              <DisputeList
                disputes={inReviewDisputes}
                getStatusIcon={getStatusIcon}
                getStatusColor={getStatusColor}
                onView={setSelectedDispute}
              />
            </TabsContent>
            <TabsContent value="resolved" className="mt-6">
              <DisputeList
                disputes={resolvedDisputes}
                getStatusIcon={getStatusIcon}
                getStatusColor={getStatusColor}
                onView={setSelectedDispute}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Dispute Details Dialog */}
      {selectedDispute && (
        <DisputeDetailsDialog
          dispute={selectedDispute}
          open={!!selectedDispute}
          onClose={() => setSelectedDispute(null)}
          onRefresh={fetchDisputes}
        />
      )}

      <Footer />
    </div>
  );
}

function DisputeList({ disputes, getStatusIcon, getStatusColor, onView }: any) {
  if (disputes.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No disputes found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {disputes.map((dispute: any) => (
        <Card key={dispute.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onView(dispute)}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  {getStatusIcon(dispute.status)}
                  <div>
                    <h3 className="font-semibold">{dispute.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Dispute #{dispute.id.slice(0, 8)}
                    </p>
                  </div>
                  <Badge variant={getStatusColor(dispute.status) as any}>
                    {dispute.status.replace("_", " ").charAt(0).toUpperCase() + dispute.status.replace("_", " ").slice(1)}
                  </Badge>
                </div>

                <div className="mb-3">
                  <p className="text-sm font-medium mb-1">Type</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {dispute.dispute_type.replace("_", " ")}
                  </p>
                </div>

                <div className="mb-3">
                  <p className="text-sm font-medium mb-1">Description</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {dispute.description}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    Created {formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true })}
                  </span>
                  {dispute.resolved_at && (
                    <span>
                      Resolved {formatDistanceToNow(new Date(dispute.resolved_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm">
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DisputeDetailsDialog({ dispute, open, onClose, onRefresh }: any) {
  const [disputeDetails, setDisputeDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && dispute) {
      fetchDisputeDetails();
    }
  }, [open, dispute]);

  const fetchDisputeDetails = async () => {
    setLoading(true);
    try {
      const details = await api.getDispute(dispute.id);
      setDisputeDetails(details);
    } catch (error) {
      console.error("Error fetching dispute details:", error);
      toast({
        title: "Error",
        description: "Failed to load dispute details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setSendingMessage(true);
    try {
      await api.addDisputeMessage(dispute.id, { message: newMessage });
      setNewMessage("");
      await fetchDisputeDetails();
      toast({
        title: "Message sent",
        description: "Your message has been added to the dispute",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dispute Details</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : disputeDetails ? (
          <div className="space-y-6">
            {/* Dispute Info */}
            <div>
              <h3 className="font-semibold mb-2">Dispute Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium capitalize">{disputeDetails.status.replace("_", " ")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium capitalize">{disputeDetails.dispute_type.replace("_", " ")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Initiator</p>
                  <p className="font-medium">{disputeDetails.initiator_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Respondent</p>
                  <p className="font-medium">{disputeDetails.respondent_name}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground">{disputeDetails.description}</p>
            </div>

            {/* Resolution */}
            {disputeDetails.resolution && (
              <div>
                <h3 className="font-semibold mb-2">Resolution</h3>
                <p className="text-sm text-muted-foreground">{disputeDetails.resolution}</p>
              </div>
            )}

            {/* Evidence */}
            {disputeDetails.evidence && disputeDetails.evidence.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Evidence</h3>
                <div className="space-y-2">
                  {disputeDetails.evidence.map((evidence: any) => (
                    <div key={evidence.id} className="flex items-center gap-2 p-2 border rounded">
                      <Paperclip className="h-4 w-4" />
                      <a
                        href={evidence.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {evidence.description || "Evidence file"}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div>
              <h3 className="font-semibold mb-2">Messages</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                {disputeDetails.messages && disputeDetails.messages.length > 0 ? (
                  disputeDetails.messages.map((message: any) => (
                    <div key={message.id} className="flex items-start gap-3 p-3 border rounded">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{message.sender_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{message.sender_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{message.message}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No messages yet</p>
                )}
              </div>

              {/* Add Message */}
              <div className="flex gap-2">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Add a message..."
                  rows={2}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !newMessage.trim()}
                >
                  {sendingMessage ? "Sending..." : "Send"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">Failed to load dispute details</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

