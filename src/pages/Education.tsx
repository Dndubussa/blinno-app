import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, Star, BookOpen, ExternalLink } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";

export default function Education() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // This would be populated from API
  const courses = [
    {
      id: "1",
      title: "Introduction to Digital Marketing",
      instructor: "Dr. Jane Smith",
      students: 245,
      duration: "8 weeks",
      rating: 4.8,
      price: "$1,500",
      category: "Marketing"
    },
    {
      id: "2",
      title: "Web Development Fundamentals",
      instructor: "Tech Academy",
      students: 189,
      duration: "12 weeks",
      rating: 4.9,
      price: "$2,000",
      category: "Technology"
    },
    {
      id: "3",
      title: "Business Management Essentials",
      instructor: "Business School",
      students: 312,
      duration: "6 weeks",
      rating: 4.7,
      price: "$1,200",
      category: "Business"
    },
  ];

  return (
    <PageLayout>
      <div className="container mx-auto px-4 max-w-6xl">
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-4xl mb-4">Education & Courses</CardTitle>
                <p className="text-muted-foreground">
                  Learn new skills from expert educators and instructors
                </p>
              </div>
              {user && (
                <Button onClick={() => navigate("/educator-dashboard")}>
                  Teach a Course
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {courses.map((course) => (
            <Card key={course.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="mb-4">
                  <Badge variant="secondary" className="mb-2">{course.category}</Badge>
                  <h3 className="text-xl font-semibold mb-2">{course.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">by {course.instructor}</p>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{course.students} students</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{course.duration}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{course.rating}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="text-lg font-semibold">{course.price}</span>
                  <Button variant="outline" size="sm">
                    Enroll
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <BookOpen className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">For Students</h3>
              <p className="text-muted-foreground mb-4">
                Browse courses, learn at your own pace, and earn certificates. Connect with instructors and fellow students.
              </p>
              {!user && (
                <Button onClick={() => navigate("/auth")}>
                  Sign Up to Learn
                </Button>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Users className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">For Educators</h3>
              <p className="text-muted-foreground mb-4">
                Share your knowledge, create courses, and build your teaching business. Manage students and track progress.
              </p>
              {!user ? (
                <Button onClick={() => navigate("/auth")}>
                  Become an Educator
                </Button>
              ) : (
                <Button onClick={() => navigate("/educator-dashboard")}>
                  Go to Educator Dashboard
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}