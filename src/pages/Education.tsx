import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, Star, BookOpen, ExternalLink, Loader2 } from "lucide-react";
import { PageLayout } from "@/components/PageLayout";
import { api } from "@/lib/api";

export default function Education() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const data = await api.getPublicCourses(50, 0);
      setCourses(data || []);
    } catch (error: any) {
      console.error('Failed to fetch courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | null, currency = 'USD') => {
    if (!price) return 'Free';
    return `${currency} ${price.toLocaleString()}`;
  };

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
              {user ? (
                <Button onClick={() => navigate("/educator-dashboard")}>
                  Teach a Course
                </Button>
              ) : (
                <Button onClick={() => navigate("/signup")}>
                  Sign Up to Teach
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : courses.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No courses found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {courses.map((course) => (
              <Card key={course.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="mb-4">
                    {course.category && (
                      <Badge variant="secondary" className="mb-2">{course.category}</Badge>
                    )}
                    <h3 className="text-xl font-semibold mb-2">{course.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      by {course.educator?.display_name || 'Unknown Instructor'}
                    </p>
                  </div>
                  {course.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{course.description}</p>
                  )}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{course.students || 0} students</span>
                    </div>
                    {course.level && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{course.level}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t">
                    <span className="text-lg font-semibold">{formatPrice(course.price)}</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/course/${course.id}`)}
                    >
                      Enroll
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <BookOpen className="h-8 w-8 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">For Students</h3>
              <p className="text-muted-foreground mb-4">
                Browse courses, learn at your own pace, and earn certificates. Connect with instructors and fellow students.
              </p>
              {!user && (
                <Button onClick={() => navigate("/signin")}>
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
                <Button onClick={() => navigate("/signup")}>
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