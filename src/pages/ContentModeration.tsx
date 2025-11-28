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
import { Shield, AlertTriangle, CheckCircle, XCircle, Eye, Ban } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ContentModeration() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [actionForm, setActionForm] = useState({
    actionType: "",
    reason: "",
    durationDays: "",
  });

  useEffect(() => {
    if (user) {
      // Check if admin (would need to fetch user roles from API)
      // For now, allow access - backend will enforce
      fetchReports();
    } else {
      navigate("/signin");
    }
  }, [user]);

  const fetchReports = async () => {
    try {
      const data = await api.getModerationReports();
      setReports(data || []);
    } catch (error: any) {
      console.error("Error fetching reports:", error);
      toast({
        title: "Error",
        description: "Failed to load reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTakeAction = async () => {
    if (!actionForm.actionType || !actionForm.reason) {
      toast({
        title: "Missing information",
        description: "Please select an action and provide a reason",
        variant: "destructive",
      });
      return;
    }

    try {
      await api.takeModerationAction(selectedReport.id, {
        actionType: actionForm.actionType,
        reason: actionForm.reason,
        durationDays: actionForm.durationDays ? parseInt(actionForm.durationDays) : undefined,
        notes: actionForm.reason,
      });
      
      toast({
        title: "Action taken",
        description: "Moderation action has been applied",
      });
      setSelectedReport(null);
      setActionForm({ actionType: "", reason: "", durationDays: "" });
      await fetchReports();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to take action",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved":
        return "default";
      case "dismissed":
        return "secondary";
      case "escalated":
        return "destructive";
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
            <p className="text-muted-foreground">Loading reports...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const pendingReports = reports.filter((r) => r.status === "pending");
  const reviewingReports = reports.filter((r) => r.status === "reviewing");
  const resolvedReports = reports.filter((r) => r.status === "resolved");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Content Moderation</h1>
            <p className="text-muted-foreground">
              Review and manage reported content
            </p>
          </div>

          <Tabs defaultValue="pending" className="w-full">
            <TabsList>
              <TabsTrigger value="pending">
                Pending ({pendingReports.length})
              </TabsTrigger>
              <TabsTrigger value="reviewing">
                Reviewing ({reviewingReports.length})
              </TabsTrigger>
              <TabsTrigger value="resolved">
                Resolved ({resolvedReports.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-6">
              <ReportList
                reports={pendingReports}
                getStatusColor={getStatusColor}
                onView={setSelectedReport}
              />
            </TabsContent>
            <TabsContent value="reviewing" className="mt-6">
              <ReportList
                reports={reviewingReports}
                getStatusColor={getStatusColor}
                onView={setSelectedReport}
              />
            </TabsContent>
            <TabsContent value="resolved" className="mt-6">
              <ReportList
                reports={resolvedReports}
                getStatusColor={getStatusColor}
                onView={setSelectedReport}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Action Dialog */}
      {selectedReport && (
        <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Take Moderation Action</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Report Details</Label>
                <div className="p-3 bg-muted rounded-md mt-2">
                  <p className="text-sm">
                    <strong>Type:</strong> {selectedReport.content_type}
                  </p>
                  <p className="text-sm">
                    <strong>Reason:</strong> {selectedReport.reason}
                  </p>
                  <p className="text-sm">
                    <strong>Description:</strong> {selectedReport.description}
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="actionType">Action *</Label>
                <Select
                  value={actionForm.actionType}
                  onValueChange={(value) =>
                    setActionForm({ ...actionForm, actionType: value })
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warn">Warn User</SelectItem>
                    <SelectItem value="hide">Hide Content</SelectItem>
                    <SelectItem value="delete">Delete Content</SelectItem>
                    <SelectItem value="suspend_user">Suspend User</SelectItem>
                    <SelectItem value="ban_user">Ban User</SelectItem>
                    <SelectItem value="no_action">No Action</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(actionForm.actionType === "suspend_user" ||
                actionForm.actionType === "ban_user") && (
                <div>
                  <Label htmlFor="duration">Duration (days, leave empty for permanent)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={actionForm.durationDays}
                    onChange={(e) =>
                      setActionForm({ ...actionForm, durationDays: e.target.value })
                    }
                    placeholder="Permanent"
                    className="mt-2"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="reason">Reason *</Label>
                <Textarea
                  id="reason"
                  value={actionForm.reason}
                  onChange={(e) =>
                    setActionForm({ ...actionForm, reason: e.target.value })
                  }
                  placeholder="Explain the action taken..."
                  rows={4}
                  className="mt-2"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedReport(null)}
                >
                  Cancel
                </Button>
                <Button onClick={handleTakeAction}>Take Action</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Footer />
    </div>
  );
}

function ReportList({ reports, getStatusColor, onView }: any) {
  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No reports found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((report: any) => (
        <Card key={report.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <h3 className="font-semibold">Report #{report.id.slice(0, 8)}</h3>
                    <p className="text-sm text-muted-foreground">
                      {report.content_type} • {report.reason}
                    </p>
                  </div>
                  <Badge variant={getStatusColor(report.status) as any}>
                    {report.status}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground mb-3">
                  {report.description}
                </p>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    Reported {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>

              <Button variant="outline" onClick={() => onView(report)}>
                <Eye className="h-4 w-4 mr-2" />
                Review
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

