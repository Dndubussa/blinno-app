import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { hasRole, getPrimaryRole } from "@/lib/roleCheck";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { SectionCard } from "@/components/SectionCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { 
  Trash2, 
  Plus, 
  Loader2, 
  Briefcase, 
  Users, 
  DollarSign, 
  TrendingUp,
  Calendar,
  Clock,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ImageUpload";
import { formatPrice, getCurrencyFromCountry } from "@/lib/currency";

export default function FreelancerDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  // Get current section from URL hash or default to overview
  const currentSection = location.hash.replace('#', '') || 'overview';
  
  // State
  const [isFreelancer, setIsFreelancer] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [balance, setBalance] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [stats, setStats] = useState({
    activeProjects: 0,
    pendingProposals: 0,
    totalEarnings: 0,
    clientCount: 0,
  });
  
  // Form states
  const [showAddProject, setShowAddProject] = useState(false);
  const [showAddProposal, setShowAddProposal] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddService, setShowAddService] = useState(false);
  const [showRequestPayout, setShowRequestPayout] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/signin");
      return;
    }
    checkFreelancerRole();
    
    // If no hash, default to overview
    if (!location.hash) {
      navigate('/freelancer-dashboard#overview', { replace: true });
    }
  }, [user, location.hash, navigate]);

  useEffect(() => {
    if (isFreelancer) {
      fetchData();
    }
  }, [isFreelancer, user]);

  const checkFreelancerRole = async () => {
    if (!user || !profile) return;
    
    try {
      const primaryRole = getPrimaryRole(profile);
      const userHasRole = await hasRole('freelancer');

      if (!userHasRole && primaryRole !== 'freelancer') {
        toast({
          title: "Access Denied",
          description: "This dashboard is only available for freelancers.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setIsFreelancer(true);
    } catch (error: any) {
      console.error('Error checking role:', error);
      toast({
        title: t("common.error"),
        description: "Failed to verify access.",
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setCheckingRole(false);
    }
  };

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch all freelancer data and stats using API
      const [projectsData, proposalsData, clientsData, invoicesData, servicesData, statsData, financialData, balanceData, transactionsData, payoutsData] = await Promise.all([
        api.getFreelancerProjects().catch((err) => {
          console.error("Error fetching projects:", err);
          return [];
        }),
        api.getFreelancerProposals().catch((err) => {
          console.error("Error fetching proposals:", err);
          return [];
        }),
        api.getFreelancerClients().catch((err) => {
          console.error("Error fetching clients:", err);
          return [];
        }),
        api.getFreelancerInvoices().catch((err) => {
          console.error("Error fetching invoices:", err);
          return [];
        }),
        api.getFreelancerServices().catch((err) => {
          console.error("Error fetching services:", err);
          return [];
        }),
        api.getDashboardStats('freelancer').catch((err) => {
          console.error("Error fetching stats:", err);
          return { activeProjects: 0, pendingProposals: 0, totalEarnings: 0, totalClients: 0 };
        }),
        api.getFinancialSummary().catch((err) => {
          console.error("Error fetching financial summary:", err);
          return null;
        }),
        api.getBalance().catch((err) => {
          console.error("Error fetching balance:", err);
          return null;
        }),
        api.getTransactions({ limit: 50 }).catch((err) => {
          console.error("Error fetching transactions:", err);
          return { transactions: [] };
        }),
        api.getMyPayouts().catch((err) => {
          console.error("Error fetching payouts:", err);
          return [];
        }),
      ]);

      setProjects(projectsData || []);
      setProposals(proposalsData || []);
      setClients(clientsData || []);
      setInvoices(invoicesData || []);
      setServices(servicesData || []);
      setFinancialSummary(financialData);
      setBalance(balanceData);
      setTransactions(transactionsData?.transactions || []);
      setPayouts(payoutsData || []);
      
      if (statsData) {
        setStats({
          activeProjects: statsData.activeProjects || 0,
          pendingProposals: statsData.pendingProposals || 0,
          totalEarnings: statsData.totalEarnings || 0,
          clientCount: statsData.totalClients || 0,
        });
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: t("common.error"),
        description: error?.message || "Failed to load dashboard data",
        variant: "destructive",
      });
    }
  };

  const handleAddProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);

    try {
      await api.createFreelancerProject({
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        status: formData.get("status") as string || "draft",
        budget: formData.get("budget") ? parseFloat(formData.get("budget") as string) : null,
        billingType: formData.get("billing_type") as string || "fixed",
        startDate: formData.get("start_date") || null,
        endDate: formData.get("end_date") || null,
      });
      
      toast({ title: t("common.success"), description: t("common.projectCreated") });
      setShowAddProject(false);
      fetchData();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message || t("common.failedToCreate"), variant: "destructive" });
    }
  };

  const handleAddProposal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);

    try {
      await api.createFreelancerProposal({
        projectId: formData.get("project_id") as string || null,
        clientId: formData.get("client_id") as string || null,
        message: formData.get("cover_letter") as string,
        proposedRate: parseFloat(formData.get("amount") as string),
        status: formData.get("status") as string || "draft",
      });
      
      toast({ title: t("common.success"), description: t("common.proposalCreated") });
      setShowAddProposal(false);
      fetchData();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message || t("common.failedToCreate"), variant: "destructive" });
    }
  };

  const handleAddClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const clientUserId = formData.get("user_id") as string;
    const contactName = formData.get("contact_name") as string;

    if (!contactName) {
      toast({ 
        title: t("common.error"), 
        description: "Contact name is required", 
        variant: "destructive" 
      });
      return;
    }

    try {
      await api.createFreelancerClient({
        userId: clientUserId || null, // null for external clients
        companyName: formData.get("company_name") as string || null,
        contactName: contactName,
        email: formData.get("email") as string || null,
        phone: formData.get("phone") as string || null,
        paymentTerms: formData.get("payment_terms") as string || null,
      });
      
      toast({ title: "Success", description: "Client added!" });
      setShowAddClient(false);
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create client", variant: "destructive" });
    }
  };

  const handleAddService = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);

    try {
      await api.createFreelancerService({
        name: formData.get("service_name") as string,
        description: formData.get("description") as string,
        category: formData.get("category") as string || null,
        hourlyRate: formData.get("hourly_rate") ? parseFloat(formData.get("hourly_rate") as string) : null,
        fixedPrice: formData.get("fixed_price") ? parseFloat(formData.get("fixed_price") as string) : null,
        pricingType: formData.get("pricing_type") as string || "hourly",
      });
      
      toast({ title: "Success", description: "Service added!" });
      setShowAddService(false);
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create service", variant: "destructive" });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    setIsUpdatingProfile(true);
    const formData = new FormData(e.currentTarget);

    const profileFormData = new FormData();
    profileFormData.append('display_name', formData.get("displayName") as string);
    profileFormData.append('bio', formData.get("bio") as string);
    profileFormData.append('location', formData.get("location") as string);
    profileFormData.append('phone', formData.get("phone") as string);
    profileFormData.append('website', formData.get("website") as string);

    try {
      await api.updateProfile(profileFormData);
      toast({ title: "Success", description: "Profile updated!" });
      window.location.reload();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setIsUpdatingProfile(false);
  };

  const handleAvatarUpload = async (url: string) => {
    if (!user) return;

    try {
      const formData = new FormData();
      formData.append('avatar_url', url);
      await api.updateProfile(formData);
      toast({ title: "Success", description: "Avatar updated!" });
      window.location.reload();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleUpdateProject = async (id: string, data: any) => {
    try {
      await api.updateFreelancerProject(id, data);
      toast({ title: "Success", description: "Project updated!" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await api.deleteFreelancerProject(id);
      toast({ title: "Success", description: "Project deleted!" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleUpdateProposal = async (id: string, data: any) => {
    try {
      await api.updateFreelancerProposal(id, data);
      toast({ title: "Success", description: "Proposal updated!" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteProposal = async (id: string) => {
    try {
      await api.deleteFreelancerProposal(id);
      toast({ title: "Success", description: "Proposal deleted!" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleUpdateClient = async (id: string, data: any) => {
    try {
      await api.updateFreelancerClient(id, data);
      toast({ title: "Success", description: "Client updated!" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteClient = async (id: string) => {
    try {
      await api.deleteFreelancerClient(id);
      toast({ title: "Success", description: "Client deleted!" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleUpdateService = async (id: string, data: any) => {
    try {
      await api.updateFreelancerService(id, data);
      toast({ title: "Success", description: "Service updated!" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteService = async (id: string) => {
    try {
      await api.deleteFreelancerService(id);
      toast({ title: "Success", description: "Service deleted!" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: { variant: "default" as const, icon: CheckCircle2 },
      completed: { variant: "default" as const, icon: CheckCircle2 },
      paid: { variant: "default" as const, icon: CheckCircle2 },
      accepted: { variant: "default" as const, icon: CheckCircle2 },
      draft: { variant: "secondary" as const, icon: FileText },
      sent: { variant: "secondary" as const, icon: FileText },
      pending: { variant: "secondary" as const, icon: Clock },
      on_hold: { variant: "outline" as const, icon: AlertCircle },
      cancelled: { variant: "destructive" as const, icon: XCircle },
      rejected: { variant: "destructive" as const, icon: XCircle },
      overdue: { variant: "destructive" as const, icon: AlertCircle },
    };

    const config = variants[status] || { variant: "outline" as const, icon: AlertCircle };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Get user's currency based on their country
  const userCurrency = profile?.location ? getCurrencyFromCountry(profile.location) : 'USD';
  
  const formatCurrency = (amount: number) => {
    return formatPrice(amount, userCurrency);
  };

  const handleRequestPayout = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get("amount") as string);
    const paymentMethod = formData.get("paymentMethod") as string;
    const accountNumber = formData.get("accountNumber") as string;
    const accountName = formData.get("accountName") as string;

    try {
      const availableBalance = balance?.available_balance || 0;
      
      if (amount > availableBalance) {
        toast({
          title: t("common.error"),
          description: `Insufficient funds. Available: ${formatCurrency(availableBalance)}`,
          variant: "destructive",
        });
        return;
      }

      if (amount < 25) {
        toast({
          title: t("common.error"),
          description: "Minimum payout amount is USD 25",
          variant: "destructive",
        });
        return;
      }

      await api.requestPayout(amount, paymentMethod, {
        accountNumber,
        accountName,
      });

      toast({
        title: t("common.success"),
        description: "Payout request submitted successfully!",
      });

      setShowRequestPayout(false);
      fetchData(); // Refresh data
    } catch (error: any) {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to request payout",
        variant: "destructive",
      });
    }
  };

  if (checkingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isFreelancer || !user) return null;

  const navigationTabs = [
    { id: "overview", label: "Overview", icon: Briefcase },
    { id: "projects", label: "Projects", icon: Briefcase },
    { id: "clients", label: "Clients", icon: Users },
    { id: "services", label: "Services", icon: Briefcase },
    { id: "financial", label: "Financial", icon: DollarSign },
    { id: "profile", label: "Profile", icon: Users },
  ];

  return (
    <DashboardLayout
      title="Freelancer Dashboard"
      navigationTabs={navigationTabs}
      defaultSection="overview"
    >
      {/* Overview Section */}
      {currentSection === 'overview' && (
      <div className="space-y-8">
            {/* Modern Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Active Projects"
                value={stats.activeProjects}
                description={`${projects.filter(p => p.status === 'active').length} in progress`}
                icon={Briefcase}
                variant="primary"
              />
              <StatCard
                title="Pending Proposals"
                value={stats.pendingProposals}
                description={`${proposals.filter(p => p.status === 'sent').length} sent`}
                icon={FileText}
                variant="warning"
              />
              <StatCard
                title="Total Earnings"
                value={formatCurrency(stats.totalEarnings)}
                description={`From ${invoices.filter(i => i.status === 'paid').length} paid invoices`}
                icon={DollarSign}
                variant="success"
              />
              <StatCard
                title="Clients"
                value={stats.clientCount}
                description="Total clients"
                icon={Users}
                variant="default"
              />
            </div>

            {/* Recent Projects */}
            <SectionCard
              title="Recent Projects"
              description="Your latest project activity"
              icon={Briefcase}
              headerActions={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddProject(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  New Project
                </Button>
              }
            >
              {projects.slice(0, 5).length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No projects yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddProject(true)}
                    className="mt-4"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Project
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.slice(0, 5).map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                          {project.title}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {project.description || "No description"}
                        </p>
                      </div>
                      <div className="ml-4">
                        {getStatusBadge(project.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
        </div>
        )}

        {/* Projects Section */}
        {currentSection === 'projects' && (
        <div className="space-y-6">
            <SectionCard
              title="Projects"
              description="Manage your client projects and track progress"
              icon={Briefcase}
              headerActions={
                <Button 
                  onClick={() => setShowAddProject(!showAddProject)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  New Project
                </Button>
              }
            >

            {showAddProject && (
              <div className="mt-6 p-6 border rounded-lg bg-muted/30">
                <h3 className="text-lg font-semibold mb-4">Create New Project</h3>
                <form onSubmit={handleAddProject} className="space-y-4">
                    <div>
                      <Label htmlFor="project-title">Title</Label>
                      <Input id="project-title" name="title" required />
                    </div>
                    <div>
                      <Label htmlFor="project-description">Description</Label>
                      <Textarea id="project-description" name="description" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="billing_type">Billing Type</Label>
                        <Select name="billing_type" defaultValue="fixed">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">Fixed Price</SelectItem>
                            <SelectItem value="hourly">Hourly Rate</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select name="status" defaultValue="draft">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="on_hold">On Hold</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="budget">Budget (TZS)</Label>
                        <Input id="budget" name="budget" type="number" step="0.01" />
                      </div>
                      <div>
                        <Label htmlFor="hourly_rate">Hourly Rate (USD)</Label>
                        <Input id="hourly_rate" name="hourly_rate" type="number" step="0.01" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="start_date">Start Date</Label>
                        <Input id="start_date" name="start_date" type="date" />
                      </div>
                      <div>
                        <Label htmlFor="end_date">End Date</Label>
                        <Input id="end_date" name="end_date" type="date" />
                      </div>
                      <div>
                        <Label htmlFor="deadline">Deadline</Label>
                        <Input id="deadline" name="deadline" type="date" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit">Create Project</Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setShowAddProject(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              {projects.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground mb-4">No projects yet</p>
                  <Button onClick={() => setShowAddProject(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Project
                  </Button>
                </div>
              ) : (
                projects.map((project) => (
                  <Card key={project.id} className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-2">
                    <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{project.title}</CardTitle>
                      {getStatusBadge(project.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{project.description}</p>
                    <div className="space-y-2 text-sm">
                      {project.budget && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Budget:</span>
                          <span className="font-medium">{formatCurrency(project.budget)}</span>
                        </div>
                      )}
                      {project.deadline && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Deadline:</span>
                          <span>{new Date(project.deadline).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                ))
              )}
            </div>
            </SectionCard>
        </div>
        )}

      {/* Clients Section */}
      {currentSection === 'clients' && (
      <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-semibold">Clients</h2>
                <p className="text-sm text-muted-foreground">
                  Clients are automatically added when they message you, book services, or place orders. You can also add external clients manually.
                </p>
              </div>
              <Button onClick={() => setShowAddClient(!showAddClient)} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add External Client
              </Button>
            </div>

            {showAddClient && (
              <div className="mt-6 p-6 border rounded-lg bg-muted/30">
                <h3 className="text-lg font-semibold mb-4">Add New Client</h3>
                <form onSubmit={handleAddClient} className="space-y-4">
                  <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
                    <strong>Note:</strong> Platform users are automatically added as clients when they interact with you. Use this form to add external clients who are not on the platform.
                  </div>
                  <div>
                    <Label htmlFor="client-user">User ID (Optional - leave blank for external client)</Label>
                    <Input id="client-user" name="user_id" placeholder="User ID (optional)" />
                    <p className="text-xs text-muted-foreground mt-1">Leave blank to add an external client</p>
                  </div>
                  <div>
                    <Label htmlFor="company_name">Company Name</Label>
                    <Input id="company_name" name="company_name" />
                  </div>
                  <div>
                    <Label htmlFor="contact_name">Contact Name *</Label>
                    <Input id="contact_name" name="contact_name" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" name="email" type="email" />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" name="phone" type="tel" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="payment_terms">Payment Terms</Label>
                    <Input id="payment_terms" name="payment_terms" placeholder="e.g., Net 30" />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" name="notes" />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit">Add Client</Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setShowAddClient(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clients.map((client) => (
                <Card key={client.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {client.display_name || client.contact_name || "Client"}
                          {client.user_id ? (
                            <Badge variant="secondary" className="text-xs">Platform User</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">External</Badge>
                          )}
                        </CardTitle>
                        {client.company_name && (
                          <p className="text-sm text-muted-foreground mt-1">{client.company_name}</p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="space-y-2 text-sm">
                        {client.email && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Email:</span>
                            <span>{client.email}</span>
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Phone:</span>
                            <span>{client.phone}</span>
                          </div>
                        )}
                        {client.payment_terms && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Payment Terms:</span>
                            <span>{client.payment_terms}</span>
                          </div>
                        )}
                      </div>
                      
                      {(client.project_count > 0 || client.invoice_count > 0) && (
                        <div className="pt-2 border-t space-y-1 text-xs text-muted-foreground">
                          {client.project_count > 0 && (
                            <div>{client.project_count} project{client.project_count !== 1 ? 's' : ''}</div>
                          )}
                          {client.invoice_count > 0 && (
                            <div>{client.invoice_count} invoice{client.invoice_count !== 1 ? 's' : ''}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {clients.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground mb-4">No clients yet</p>
                  <Button onClick={() => setShowAddClient(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Client
                  </Button>
                </CardContent>
              </Card>
            )}
        </div>
        )}

      {/* Services Section */}
      {currentSection === 'services' && (
      <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-semibold">Services</h2>
                <p className="text-sm text-muted-foreground">
                  Manage your service offerings and pricing
                </p>
              </div>
              <Button onClick={() => setShowAddService(!showAddService)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Service
              </Button>
            </div>

            {showAddService && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Add New Service</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddService} className="space-y-4">
                    <div>
                      <Label htmlFor="service_name">Service Name</Label>
                      <Input id="service_name" name="service_name" required />
                    </div>
                    <div>
                      <Label htmlFor="service-description">Description</Label>
                      <Textarea id="service-description" name="description" />
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Input id="category" name="category" />
                    </div>
                    <div>
                      <Label htmlFor="pricing_type">Pricing Type</Label>
                      <Select name="pricing_type" defaultValue="hourly">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Hourly</SelectItem>
                          <SelectItem value="fixed">Fixed</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="hourly_rate">Hourly Rate (USD)</Label>
                        <Input id="hourly_rate" name="hourly_rate" type="number" step="0.01" />
                      </div>
                      <div>
                        <Label htmlFor="fixed_price">Fixed Price (USD)</Label>
                        <Input id="fixed_price" name="fixed_price" type="number" step="0.01" />
                      </div>
                    </div>
                    <Button type="submit">Add Service</Button>
                  </form>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <Card key={service.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle>{service.service_name}</CardTitle>
                      {service.is_active ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">{service.description}</p>
                    <div className="space-y-2 text-sm">
                      {service.hourly_rate && (
                        <div>
                          <span className="text-muted-foreground">Hourly: </span>
                          <span className="font-medium">{formatCurrency(service.hourly_rate)}/hr</span>
                        </div>
                      )}
                      {service.fixed_price && (
                        <div>
                          <span className="text-muted-foreground">Fixed: </span>
                          <span className="font-medium">{formatCurrency(service.fixed_price)}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {services.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground mb-4">No services yet</p>
                  <Button onClick={() => setShowAddService(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Service
                  </Button>
                </CardContent>
              </Card>
            )}
        </div>
        )}

      {/* Financial Section */}
      {currentSection === 'financial' && (
      <div className="space-y-8">
            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Available Balance"
                value={balance ? formatCurrency(balance.available_balance || 0) : formatCurrency(0)}
                description="Ready for payout"
                icon={DollarSign}
                variant="success"
              />
              <StatCard
                title="Pending Balance"
                value={balance ? formatCurrency(balance.pending_balance || 0) : formatCurrency(0)}
                description="Awaiting payment"
                icon={Clock}
                variant="warning"
              />
              <StatCard
                title="Total Earned"
                value={balance ? formatCurrency(balance.total_earned || 0) : formatCurrency(stats.totalEarnings)}
                description="Lifetime earnings"
                icon={TrendingUp}
                variant="primary"
              />
              <StatCard
                title="Total Paid Out"
                value={balance ? formatCurrency(balance.total_paid_out || 0) : formatCurrency(0)}
                description="Withdrawn funds"
                icon={DollarSign}
                variant="default"
              />
            </div>

            {/* Invoices Section */}
            <SectionCard
              title="Invoices"
              description="Manage and track your invoices"
              icon={FileText}
              headerActions={
                <Button onClick={() => setShowAddProject(!showAddProject)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Invoice
                </Button>
              }
            >
              {invoices.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No invoices yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div 
                      key={invoice.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                          Invoice #{invoice.id?.slice(0, 8) || 'N/A'}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {invoice.description || 'No description'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Due: {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'Not set'}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-lg font-semibold mb-2">{formatCurrency(invoice.amount)}</div>
                        {getStatusBadge(invoice.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Payout Request Section */}
            <SectionCard
              title="Payouts"
              description="Request payouts of your earnings"
              icon={DollarSign}
              headerActions={
                <Button 
                  onClick={() => setShowRequestPayout(!showRequestPayout)}
                  disabled={!balance || (balance.available_balance || 0) < 25}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Request Payout
                </Button>
              }
            >
              {!balance || (balance.available_balance || 0) < 25 ? (
                <div className="text-center py-8 p-4 bg-muted/30 rounded-lg border border-warning/20">
                  <p className="text-muted-foreground">
                    Minimum payout amount is USD 25. Available balance: {formatCurrency(balance?.available_balance || 0)}
                  </p>
                </div>
              ) : null}

              {showRequestPayout && (
                <div className="mt-6 p-6 border rounded-lg bg-muted/30">
                  <h3 className="text-lg font-semibold mb-2">Request Payout</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Available: {formatCurrency(balance?.available_balance || 0)}
                  </p>
                  <form onSubmit={handleRequestPayout} className="space-y-4">
                          <div>
                            <Label htmlFor="payout-amount">Amount (USD)</Label>
                            <Input
                              id="payout-amount"
                              name="amount"
                              type="number"
                              step="0.01"
                              min="25"
                              max={balance?.available_balance || 0}
                              required
                              placeholder="25"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Minimum: USD 25
                            </p>
                          </div>
                          <div>
                            <Label htmlFor="payment-method">Payment Method</Label>
                            <Select name="paymentMethod" required>
                              <SelectTrigger id="payment-method">
                                <SelectValue placeholder={t("common.selectPaymentMethod")} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="clickpesa">Click Pesa</SelectItem>
                                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="account-number">Account Number / Phone Number</Label>
                            <Input
                              id="account-number"
                              name="accountNumber"
                              type="text"
                              required
                              placeholder="e.g., 0712345678 or Account Number"
                            />
                          </div>
                          <div>
                            <Label htmlFor="account-name">Account Name</Label>
                            <Input
                              id="account-name"
                              name="accountName"
                              type="text"
                              required
                              placeholder="Account holder name"
                            />
                          </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        Submit Payout Request
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => setShowRequestPayout(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {payouts.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No payout requests yet</p>
                </div>
              ) : (
                <div className="space-y-3 mt-6">
                  {payouts.map((payout) => (
                    <div 
                      key={payout.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                          Payout #{payout.id?.slice(0, 8) || 'N/A'}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {payout.payment_method?.replace('_', ' ').toUpperCase() || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {payout.created_at ? new Date(payout.created_at).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <div className="text-lg font-semibold mb-2">{formatCurrency(payout.amount)}</div>
                        {getStatusBadge(payout.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Transaction History */}
            <SectionCard
              title="Recent Transactions"
              description="Your financial transaction history"
              icon={TrendingUp}
            >
              {transactions.length === 0 ? (
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No transactions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.slice(0, 10).map((transaction) => (
                    <div 
                      key={transaction.id} 
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base capitalize group-hover:text-primary transition-colors">
                          {transaction.transaction_type?.replace(/_/g, ' ') || 'Transaction'}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                              {transaction.description || 'No description'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(transaction.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-semibold ${
                              transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Balance: {formatCurrency(transaction.balance_after || 0)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
            </SectionCard>
        </div>
        )}

      {/* Profile Section */}
      {currentSection === 'profile' && (
      <div className="space-y-6">
            <SectionCard
              title="Profile Settings"
              description="Update your freelancer profile information"
              icon={Users}
            >
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div>
                    <Label htmlFor="avatar">Profile Avatar</Label>
                    <div className="mt-2">
                      {profile?.avatar_url ? (
                        <div className="flex items-start gap-4 mb-4">
                          <img
                            src={profile.avatar_url}
                            alt="Current avatar"
                            className="w-24 h-24 rounded-full object-cover"
                          />
                        </div>
                      ) : null}
                      <ImageUpload
                        bucket="avatars"
                        userId={user?.id || ""}
                        onUploadComplete={handleAvatarUpload}
                        currentImage={profile?.avatar_url}
                        maxSizeMB={2}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      name="displayName"
                      defaultValue={profile?.display_name}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      name="bio"
                      defaultValue={profile?.bio || ""}
                      placeholder="Tell us about yourself and your services..."
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      name="location"
                      defaultValue={profile?.location || ""}
                      placeholder="City, Country"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      defaultValue={profile?.phone || ""}
                      placeholder="+1 (XXX) XXX-XXXX"
                    />
                  </div>

                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      name="website"
                      type="url"
                      defaultValue={profile?.website || ""}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>

                  <div>
                    <Label>Email</Label>
                    <Input value={user?.email || ""} disabled />
                    <p className="text-xs text-muted-foreground mt-1">
                      Email cannot be changed
                    </p>
                  </div>

                  <Button type="submit" disabled={isUpdatingProfile}>
                    {isUpdatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </form>
            </SectionCard>
        </div>
      )}
    </DashboardLayout>
  );
}

