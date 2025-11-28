import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { MediaPlayer } from "@/components/MediaPlayer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Play, Lock, CheckCircle } from "lucide-react";

interface Course {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  price: number;
  category: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface Lesson {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  lesson_type: string;
  content: string | null;
  video_url: string | null;
  order_index: number;
  is_preview: boolean;
  created_at: string;
  updated_at: string;
}

export default function CourseViewer() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrolled, setEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    fetchCourseData();
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      // Fetch course details
      const coursesData = await api.getCourses();
      const courseData = coursesData.find((c: any) => c.id === courseId);
      setCourse(courseData);

      // Fetch lessons for the course
      const lessonsData = await api.getLessons(courseId);
      setLessons(lessonsData);

      // For now, we'll assume the user is enrolled if they're viewing the course
      // In a real implementation, you would check enrollment status
      setEnrolled(true);
      
      // Select the first lesson
      if (lessonsData.length > 0) {
        setSelectedLesson(lessonsData[0]);
      }
    } catch (error: any) {
      console.error("Error fetching course data:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load course data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!user) {
      navigate("/signin");
      return;
    }

    setEnrolling(true);
    try {
      // In a real implementation, you would call an enroll API endpoint
      setEnrolled(true);
      toast({
        title: "Success",
        description: "You have been enrolled in this course!",
      });
      
      // Select the first lesson after enrollment
      if (lessons.length > 0) {
        setSelectedLesson(lessons[0]);
      }
    } catch (error: any) {
      console.error("Error enrolling in course:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to enroll in course",
        variant: "destructive",
      });
    } finally {
      setEnrolling(false);
    }
  };

  const selectLesson = (lesson: Lesson) => {
    // In a real implementation, you would check enrollment status
    setSelectedLesson(lesson);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Course Not Found</h1>
          <p className="text-muted-foreground">The course you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/marketplace")} className="mt-4">
            Browse Courses
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-3xl">{course.title}</CardTitle>
                    <CardDescription className="mt-2">{course.description}</CardDescription>
                  </div>
                  <Badge variant="secondary">{course.category}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {selectedLesson ? (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-2">{selectedLesson.title}</h2>
                      {selectedLesson.description && (
                        <p className="text-muted-foreground mb-4">{selectedLesson.description}</p>
                      )}
                    </div>

                    {selectedLesson.lesson_type === "video" && selectedLesson.video_url ? (
                      <MediaPlayer 
                        url={selectedLesson.video_url} 
                        type="video" 
                        title={selectedLesson.title}
                        className="w-full"
                      />
                    ) : selectedLesson.lesson_type === "audio" && selectedLesson.video_url ? (
                      <MediaPlayer 
                        url={selectedLesson.video_url} 
                        type="audio" 
                        title={selectedLesson.title}
                      />
                    ) : selectedLesson.lesson_type === "text" && selectedLesson.content ? (
                      <Card>
                        <CardContent className="p-6 prose max-w-none">
                          <div dangerouslySetInnerHTML={{ __html: selectedLesson.content }} />
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="bg-muted rounded-lg p-8 text-center">
                        <p className="text-muted-foreground">
                          This lesson doesn't have any content yet.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-muted rounded-lg p-8 text-center">
                    <Play className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Select a Lesson</h3>
                    <p className="text-muted-foreground">
                      Choose a lesson from the sidebar to start learning.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Course Content</CardTitle>
                <CardDescription>{lessons.length} lessons</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lessons.map((lesson) => (
                    <div 
                      key={lesson.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedLesson?.id === lesson.id 
                          ? "bg-primary/10 border border-primary" 
                          : "hover:bg-muted"
                      }`}
                      onClick={() => selectLesson(lesson)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {selectedLesson?.id === lesson.id ? (
                            <CheckCircle className="h-5 w-5 text-primary" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-muted border flex items-center justify-center">
                              <span className="text-xs font-medium text-muted-foreground">
                                {lesson.order_index}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{lesson.title}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {lesson.lesson_type}
                            </Badge>
                            {lesson.is_preview && (
                              <Badge variant="secondary" className="text-xs">
                                Preview
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {!enrolled && (
                  <div className="mt-6 pt-6 border-t">
                    <Button onClick={handleEnroll} className="w-full" disabled={enrolling}>
                      {enrolling ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enrolling...
                        </>
                      ) : (
                        "Enroll in Course"
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}