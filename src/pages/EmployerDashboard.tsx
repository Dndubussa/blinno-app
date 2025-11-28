import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { hasRole, getPrimaryRole } from "@/lib/roleCheck";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Trash2, 
  Plus, 
  Loader2, 
  Briefcase,
  Users,
  Eye,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  DollarSign
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const JOB_CATEGORIES = [
  "Technology",
  "Finance",
  "Healthcare",
  "Education",
  "Marketing",
  "Sales",
  "Customer Service",
  "Operations",
  "Human Resources",
  "Other"
];

export default function EmployerDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Get current section from URL hash or default to overview
  const currentSection = location.hash.replace('#', '') || 'overview';
  
  const [isEmployer, setIsEmployer] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [jobPostings, setJobPostings] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    totalApplications: 0,
    pendingApplications: 0,
  });
  
  const [showAddJob, setShowAddJob] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isRemote, setIsRemote] = useState(false);
  const [jobType, setJobType] = useState<'full_time' | 'part_time' | 'contract' | 'internship' | 'freelance'>('full_time');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/signin");
      return;
    }
    checkEmployerRole();
    
    // If no hash, default to overview
    if (!location.hash) {
      navigate('/employer-dashboard#overview', { replace: true });
    }
  }, [user, location.hash, navigate]);

  useEffect(() => {
    if (isEmployer) {
      fetchData();
    }
  }, [isEmployer, user]);

  const checkEmployerRole = async () => {
    if (!user || !profile) return;
    
    try {
      const primaryRole = getPrimaryRole(profile);
      const userHasRole = await hasRole('employer');

      if (!userHasRole && primaryRole !== 'employer') {
        toast({
          title: "Access Denied",
          description: "This dashboard is only available for employers.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setIsEmployer(true);
    } catch (error: any) {
      console.error('Error checking role:', error);
      toast({
        title: "Error",
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
      const [jobsData, applicationsData, statsData] = await Promise.all([
        api.getJobPostings(),
        api.getJobApplications(),
        api.getDashboardStats('employer'),
      ]);

      setJobPostings(jobsData || []);
      setApplications(applicationsData || []);
      
      if (statsData) {
        setStats({
          totalJobs: statsData.totalJobPostings || 0,
          activeJobs: statsData.activeJobs || 0,
          totalApplications: applicationsData?.length || 0,
          pendingApplications: statsData.pendingApplications || 0,
        });
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    }
  };

  const handleAddJob = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const skills = (formData.get("skills_required") as string).split(",").map(s => s.trim()).filter(s => s);

    try {
      await api.createJobPosting({
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        companyName: formData.get("company_name") as string,
        location: formData.get("location") as string,
        jobType: jobType,
        category: formData.get("category") as string,
        skillsRequired: skills,
        salaryMin: formData.get("salary_min") ? parseFloat(formData.get("salary_min") as string) : null,
        salaryMax: formData.get("salary_max") ? parseFloat(formData.get("salary_max") as string) : null,
        salaryCurrency: formData.get("salary_currency") as string || 'USD',
        isRemote: isRemote,
        applicationDeadline: formData.get("application_deadline") ? new Date(formData.get("application_deadline") as string).toISOString() : null,
        applicationUrl: formData.get("application_url") as string || null,
        isActive,
      });

      toast({
        title: "Success",
        description: "Job posting created successfully!",
      });
      
      setShowAddJob(false);
      setIsActive(true);
      setIsRemote(false);
      setJobType('full_time');
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (!confirm("Are you sure you want to delete this job posting?")) return;

    try {
      await api.deleteJobPosting(id);

      toast({
        title: "Success",
        description: "Job posting deleted successfully!",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateJob = async (id: string, data: any) => {
    try {
      await api.updateJobPosting(id, data);

      toast({
        title: "Success",
        description: "Job posting updated successfully!",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateApplicationStatus = async (applicationId: string, newStatus: string) => {
    try {
      await api.updateJobApplicationStatus(applicationId, newStatus);

      toast({
        title: "Success",
        description: "Application status updated!",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !profile) return;

    setIsUpdatingProfile(true);
    const formData = new FormData(e.currentTarget);

    try {
      const profileData = new FormData();
      profileData.append('display_name', formData.get("displayName") as string);
      profileData.append('bio', formData.get("bio") as string);
      profileData.append('location', formData.get("location") as string);
      profileData.append('phone', formData.get("phone") as string);
      profileData.append('website', formData.get("website") as string);
      await api.updateProfile(profileData);

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  if (checkingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isEmployer || !user) return null;

  const navigationTabs = [
    { id: "overview", label: "Overview", icon: Briefcase },
    { id: "jobs", label: "Jobs", icon: Briefcase },
    { id: "applications", label: "Applications", icon: FileText },
    { id: "analytics", label: "Analytics", icon: Eye },
  ];

  return (
    <DashboardLayout
      title="Employer Dashboard"
      navigationTabs={navigationTabs}
      defaultSection="overview"
    >

      {/* Overview Section */}
      {currentSection === 'overview' && (
      <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold">Dashboard Overview</h2>
                  <p className="text-sm text-muted-foreground">
                    Your hiring dashboard at a glance
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalJobs}</div>
                      <p className="text-xs text-muted-foreground">Posted jobs</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.activeJobs}</div>
                      <p className="text-xs text-muted-foreground">Currently open</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalApplications}</div>
                      <p className="text-xs text-muted-foreground">Received applications</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.pendingApplications}</div>
                      <p className="text-xs text-muted-foreground">Awaiting review</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Applications */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Applications</CardTitle>
                    <CardDescription>Latest job applications received</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(applications || []).slice(0, 5).length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No applications yet</p>
                    ) : (
                      <div className="space-y-4">
                        {(applications || []).slice(0, 5).map((application) => (
                          <div key={application.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <h3 className="font-semibold">
                                {application.job_postings?.title || "Job Application"}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {application.profiles?.display_name || "Applicant"} • {new Date(application.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant={application.status === 'accepted' ? "default" : application.status === 'rejected' ? "destructive" : "secondary"}>
                              {application.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

      {/* Jobs Section */}
      {currentSection === 'jobs' && (
      <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold">Job Postings</h2>
                    <p className="text-sm text-muted-foreground">
                      Manage your job postings
                    </p>
                  </div>
                  <Button onClick={() => setShowAddJob(!showAddJob)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Post New Job
                  </Button>
                </div>

                {showAddJob && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Create Job Posting</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleAddJob} className="space-y-4">
                        <div>
                          <Label htmlFor="title">Job Title</Label>
                          <Input id="title" name="title" required />
                        </div>
                        <div>
                          <Label htmlFor="company_name">Company Name</Label>
                          <Input id="company_name" name="company_name" required />
                        </div>
                        <div>
                          <Label htmlFor="description">Job Description</Label>
                          <Textarea id="description" name="description" rows={6} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="category">Category</Label>
                            <Select name="category" required>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {JOB_CATEGORIES.map((cat) => (
                                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="job_type">Employment Type</Label>
                            <Select name="job_type" value={jobType} onValueChange={(v: any) => setJobType(v)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="full_time">Full-time</SelectItem>
                                <SelectItem value="part_time">Part-time</SelectItem>
                                <SelectItem value="contract">Contract</SelectItem>
                                <SelectItem value="internship">Internship</SelectItem>
                                <SelectItem value="freelance">Freelance</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="location">Location</Label>
                            <Input id="location" name="location" placeholder="e.g., Dar es Salaam" />
                          </div>
                          <div>
                            <Label htmlFor="salary_min">Min Salary (USD)</Label>
                            <Input id="salary_min" name="salary_min" type="number" />
                          </div>
                          <div>
                            <Label htmlFor="salary_max">Max Salary (USD)</Label>
                            <Input id="salary_max" name="salary_max" type="number" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="skills_required">Required Skills (comma-separated)</Label>
                            <Input id="skills_required" name="skills_required" placeholder="JavaScript, React, Node.js" />
                          </div>
                          <div>
                            <Label htmlFor="application_deadline">Application Deadline</Label>
                            <Input id="application_deadline" name="application_deadline" type="date" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="application_url">Application URL</Label>
                            <Input id="application_url" name="application_url" type="url" placeholder="https://example.com/apply" />
                          </div>
                          <div>
                            <Label htmlFor="salary_currency">Currency</Label>
                            <Select name="salary_currency" defaultValue="USD">
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="USD">USD (US Dollar)</SelectItem>
                                <SelectItem value="USD">USD (US Dollar)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="is-active"
                              checked={isActive}
                              onCheckedChange={setIsActive}
                            />
                            <Label htmlFor="is-active">Active Posting</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="is-remote"
                              checked={isRemote}
                              onCheckedChange={setIsRemote}
                            />
                            <Label htmlFor="is-remote">Remote Work</Label>
                          </div>
                        </div>
                        <Button type="submit">Post Job</Button>
                      </form>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-4">
                  {(jobPostings || []).map((job) => (
                    <Card key={job.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{job.title}</CardTitle>
                            <CardDescription>{job.company_name}</CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant={job.is_active ? "default" : "secondary"}>
                              {job.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteJob(job.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{job.description}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Location</p>
                            <p>{job.location || 'Not specified'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Type</p>
                            <p className="capitalize">{job.job_type?.replace('_', ' ') || 'Not specified'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Salary</p>
                            <p>
                              {job.salary_min && job.salary_max 
                                ? `${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()} ${job.salary_currency || 'USD'}`
                                : 'Not specified'}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Applications</p>
                            <p>{job.application_count || 0}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {(jobPostings || []).length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-muted-foreground mb-4">No job postings yet</p>
                      <Button onClick={() => setShowAddJob(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Post Your First Job
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

      {/* Applications Section */}
      {currentSection === 'applications' && (
      <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold">Job Applications</h2>
                  <p className="text-sm text-muted-foreground">
                    Review applications for your job postings
                  </p>
                </div>

                <div className="space-y-4">
                  {(applications || []).map((application) => (
                    <Card key={application.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">
                              {application.job_postings?.title || "Job Application"}
                            </CardTitle>
                            <CardDescription>
                              Applied by {application.profiles?.display_name || "Applicant"} on {new Date(application.created_at).toLocaleDateString()}
                            </CardDescription>
                          </div>
                          <Badge variant={application.status === 'accepted' ? "default" : application.status === 'rejected' ? "destructive" : "secondary"}>
                            {application.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                          <div>
                            <p className="text-muted-foreground">Email</p>
                            <p>{application.profiles?.email || 'Not provided'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Phone</p>
                            <p>{application.profiles?.phone || 'Not provided'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Cover Letter</p>
                            <p className="line-clamp-2">{application.cover_letter || 'Not provided'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Applied For</p>
                            <p>{application.job_postings?.company_name || 'Not specified'}</p>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          {application.status === 'pending' && (
                            <>
                              <Button
                                variant="outline"
                                onClick={() => handleUpdateApplicationStatus(application.id, 'accepted')}
                              >
                                Accept
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => handleUpdateApplicationStatus(application.id, 'rejected')}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {application.status === 'accepted' && (
                            <Button
                              variant="outline"
                              onClick={() => handleUpdateApplicationStatus(application.id, 'pending')}
                            >
                              Revert to Pending
                            </Button>
                          )}
                          {application.status === 'rejected' && (
                            <Button
                              variant="outline"
                              onClick={() => handleUpdateApplicationStatus(application.id, 'pending')}
                            >
                              Revert to Pending
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {(applications || []).length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-muted-foreground">No job applications yet</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

      {/* Profile Section */}
      {currentSection === 'profile' && (
      <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold">Profile Settings</h2>
                  <p className="text-sm text-muted-foreground">
                    Update your employer profile information
                  </p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                      <div>
                        <Label htmlFor="displayName">Display Name</Label>
                        <Input
                          id="displayName"
                          name="displayName"
                          defaultValue={profile?.display_name || ""}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                          id="bio"
                          name="bio"
                          defaultValue={profile?.bio || ""}
                          rows={4}
                          placeholder="Tell us about your company and hiring needs"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="location">Location</Label>
                          <Input
                            id="location"
                            name="location"
                            defaultValue={profile?.location || ""}
                            placeholder="e.g., Dar es Salaam"
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            defaultValue={profile?.phone || ""}
                            placeholder="e.g., +1 (XXX) XXX-XXXX"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          name="website"
                          type="url"
                          defaultValue={profile?.website || ""}
                          placeholder="https://example.com"
                        />
                      </div>
                      <Button type="submit" disabled={isUpdatingProfile}>
                        {isUpdatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Update Profile
                      </Button>
                    </form>
                  </CardContent>
                </Card>
      </div>
      )}
    </DashboardLayout>
  );
}