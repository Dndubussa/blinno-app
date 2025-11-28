import { useState, useEffect } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Briefcase, Clock, DollarSign, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

export default function Jobs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [jobListings, setJobListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const data = await api.getPublicJobs(50, 0);
      setJobListings(data || []);
    } catch (error: any) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatSalary = (job: any) => {
    if (job.salary_min && job.salary_max) {
      return `${job.salary_currency || 'USD'} ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}`;
    } else if (job.salary_min) {
      return `${job.salary_currency || 'USD'} ${job.salary_min.toLocaleString()}+`;
    }
    return 'Negotiable';
  };

  const formatJobType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <PageLayout>
      <div className="container mx-auto px-4 max-w-6xl">
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-4xl mb-4">Jobs & Opportunities</CardTitle>
                <p className="text-muted-foreground">
                  Find your next opportunity or post a job opening
                </p>
              </div>
              {user && (
                <Button onClick={() => navigate("/employer-dashboard")}>
                  Post a Job
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : jobListings.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No job listings found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 mb-8">
            {jobListings.map((job) => (
              <Card key={job.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{job.title}</h3>
                      <p className="text-muted-foreground mb-2">{job.company_name}</p>
                      {job.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{job.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {job.is_remote ? 'Remote' : job.location}
                        </Badge>
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {formatJobType(job.job_type)}
                        </Badge>
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {formatSalary(job)}
                        </Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                        </Badge>
                      </div>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => job.application_url ? window.open(job.application_url, '_blank') : navigate(`/jobs/${job.id}`)}
                    >
                      Apply Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-semibold mb-4">For Employers</h3>
            <p className="text-muted-foreground mb-4">
              Post job openings and find qualified candidates. Manage applications from your employer dashboard.
            </p>
            {!user ? (
              <Button onClick={() => navigate("/signup")}>
                Sign Up to Post Jobs
              </Button>
            ) : (
              <Button onClick={() => navigate("/employer-dashboard")}>
                Go to Employer Dashboard
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

