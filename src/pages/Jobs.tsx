import { PageLayout } from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Briefcase, Clock, DollarSign } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Jobs() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // This would be populated from API
  const jobListings = [
    {
      id: "1",
      title: "Senior Software Developer",
      company: "Tech Company",
      location: "Remote",
      type: "Full-time",
      salary: "$50,000 - $80,000",
      posted: "2 days ago"
    },
    {
      id: "2",
      title: "Marketing Manager",
      company: "Creative Agency",
      location: "New York",
      type: "Full-time",
      salary: "$40,000 - $65,000",
      posted: "5 days ago"
    },
    {
      id: "3",
      title: "Graphic Designer",
      company: "Design Studio",
      location: "Remote",
      type: "Part-time",
      salary: "$25,000 - $40,000",
      posted: "1 week ago"
    },
  ];

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

        <div className="space-y-4 mb-8">
          {jobListings.map((job) => (
            <Card key={job.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{job.title}</h3>
                    <p className="text-muted-foreground mb-2">{job.company}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {job.location}
                      </Badge>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        {job.type}
                      </Badge>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {job.salary}
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {job.posted}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="outline">Apply Now</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-semibold mb-4">For Employers</h3>
            <p className="text-muted-foreground mb-4">
              Post job openings and find qualified candidates. Manage applications from your employer dashboard.
            </p>
            {!user ? (
              <Button onClick={() => navigate("/auth")}>
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

