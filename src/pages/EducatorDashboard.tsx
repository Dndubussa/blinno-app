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
  Plus, 
  Loader2, 
  GraduationCap,
  BookOpen,
  Users,
  DollarSign,
  TrendingUp,
  Star,
  Play,
  CheckCircle2,
  Clock
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/ImageUpload";
import { formatPrice, getCurrencyFromCountry } from "@/lib/currency";

export default function EducatorDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  // Get current section from URL hash or default to overview
  const currentSection = location.hash.replace('#', '') || 'overview';
  
  const [isEducator, setIsEducator] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    totalEnrollments: 0,
    totalRevenue: 0,
  });
  
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [isPublished, setIsPublished] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    level: "all",
    price: "",
    image_url: "",
  });

  useEffect(() => {
    if (!user) {
      navigate("/signin");
      return;
    }
    checkEducatorRole();
    
    // If no hash, default to overview
    if (!location.hash) {
      navigate('/educator-dashboard#overview', { replace: true });
    }
  }, [user, location.hash, navigate]);

  useEffect(() => {
    if (isEducator) {
      fetchData();
    }
  }, [isEducator, user]);

  const checkEducatorRole = async () => {
    if (!user || !profile) return;
    
    try {
      const primaryRole = getPrimaryRole(profile);
      const userHasRole = await hasRole('educator');

      if (!userHasRole && primaryRole !== 'educator') {
        toast({
          title: t("common.accessDenied"),
          description: "This dashboard is only available for educators.",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setIsEducator(true);
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
      // Fetch courses, enrollments, lessons, and stats using API
      const [coursesData, enrollmentsData, lessonsData, statsData] = await Promise.all([
        api.getCourses(),
        api.getCourseEnrollments(),
        api.getLessons(),
        api.getDashboardStats('educator'),
      ]);

      setCourses(coursesData || []);
      setEnrollments(enrollmentsData || []);
      setLessons(lessonsData || []);
      
      if (statsData) {
        setStats({
          totalCourses: statsData.totalCourses || 0,
          totalStudents: statsData.totalStudents || 0,
          totalEnrollments: statsData.totalEnrollments || 0,
          totalRevenue: statsData.totalRevenue || 0,
        });
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: t("common.error"),
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    }
  };

  const handleAddCourse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);

    try {
      await api.createCourse({
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        category: formData.get("category") as string,
        level: formData.get("level") as string || "all",
        price: parseFloat(formData.get("price") as string) || 0,
        isPublished,
      });
      
      toast({ title: t("common.success"), description: t("common.courseCreated") });
      setShowAddCourse(false);
      setFormData({ title: "", description: "", category: "", level: "all", price: "", image_url: "" });
      setIsPublished(false);
      fetchData();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message || t("common.failedToCreate"), variant: "destructive" });
    }
  };

  const handleAddLesson = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !selectedCourse) return;

    const formData = new FormData(e.currentTarget);

    try {
      // Get existing lessons to determine next order index
      const existingLessons = await api.getLessons(selectedCourse);
      const nextOrder = existingLessons && existingLessons.length > 0 
        ? Math.max(...existingLessons.map((l: any) => l.order_index || 0)) + 1 
        : 1;

      await api.createLesson({
        courseId: selectedCourse,
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        lessonType: formData.get("lesson_type") as string || "video",
        content: formData.get("content") as string || null,
        videoUrl: formData.get("video_url") as string || null,
        orderIndex: nextOrder,
        isPreview,
      });
      
      toast({ title: t("common.success"), description: t("common.lessonCreated") });
      setShowAddLesson(false);
      setSelectedCourse("");
      setIsPreview(false);
      fetchData();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message || t("common.failedToCreate"), variant: "destructive" });
    }
  };

  const handleUpdateCourse = async (id: string, data: any) => {
    try {
      await api.updateCourse(id, data);
      toast({ title: t("common.success"), description: t("common.courseUpdated") });
      fetchData();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message || t("common.failedToUpdate"), variant: "destructive" });
    }
  };

  const handleDeleteCourse = async (id: string) => {
    try {
      await api.deleteCourse(id);
      toast({ title: t("common.success"), description: t("common.courseDeleted") });
      fetchData();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message || t("common.failedToDelete"), variant: "destructive" });
    }
  };

  const handleUpdateLesson = async (id: string, data: any) => {
    try {
      await api.updateLesson(id, data);
      toast({ title: t("common.success"), description: t("common.lessonUpdated") });
      fetchData();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message || t("common.failedToUpdate"), variant: "destructive" });
    }
  };

  const handleDeleteLesson = async (id: string) => {
    try {
      await api.deleteLesson(id);
      toast({ title: t("common.success"), description: t("common.lessonDeleted") });
      fetchData();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message || t("common.failedToDelete"), variant: "destructive" });
    }
  };

  const handleUpdateEnrollmentStatus = async (enrollmentId: string, status: string) => {
    try {
      await api.updateCourseEnrollmentStatus(enrollmentId, status);
      toast({ title: t("common.success"), description: t("common.enrollmentStatusUpdated") });
      fetchData();
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message || t("common.failedToUpdate"), variant: "destructive" });
    }
  };

  // Get user's currency based on their country
  const userCurrency = profile?.location ? getCurrencyFromCountry(profile.location) : 'USD';
  
  const formatCurrency = (amount: number) => {
    return formatPrice(amount, userCurrency);
  };

  if (checkingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isEducator || !user) return null;

  const navigationTabs = [
    { id: "overview", label: "Overview", icon: GraduationCap },
    { id: "courses", label: "Courses", icon: BookOpen },
    { id: "students", label: "Students", icon: Users },
    { id: "analytics", label: "Analytics", icon: TrendingUp },
  ];

  return (
    <DashboardLayout
      title="Educator Dashboard"
      navigationTabs={navigationTabs}
      defaultSection="overview"
    >
      {/* Overview Section */}
      {currentSection === 'overview' && (
      <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard
                    title="Courses"
                    value={stats.totalCourses}
                    description={`${courses.filter(c => c.is_published).length} published`}
                    icon={BookOpen}
                    variant="primary"
                  />
                  <StatCard
                    title="Students"
                    value={stats.totalStudents}
                    description="Total enrolled"
                    icon={Users}
                    variant="success"
                  />
                  <StatCard
                    title="Enrollments"
                    value={stats.totalEnrollments}
                    description="Total enrollments"
                    icon={TrendingUp}
                    variant="default"
                  />
                  <StatCard
                    title="Revenue"
                    value={formatCurrency(stats.totalRevenue)}
                    description="From paid courses"
                    icon={DollarSign}
                    variant="success"
                  />
                </div>

                {/* Recent Enrollments */}
                <SectionCard
                  title="Recent Enrollments"
                  description="Your latest student enrollments"
                  icon={Users}
                >
                  {(enrollments || []).slice(0, 5).length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">No enrollments yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(enrollments || []).slice(0, 5).map((enrollment) => (
                        <div 
                          key={enrollment.id} 
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors group"
                        >
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
                              {enrollment.courses?.title || "Course"}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {enrollment.profiles?.display_name || "Student"} • {new Date(enrollment.enrollment_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="ml-4">
                            <Badge variant={enrollment.status === 'completed' ? "default" : "secondary"}>
                              {enrollment.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
            </div>
            )}

      {/* Courses Section */}
      {currentSection === 'courses' && (
      <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold">Courses</h2>
                    <p className="text-sm text-muted-foreground">
                      Manage your educational courses
                    </p>
                  </div>
                  <Button onClick={() => setShowAddCourse(!showAddCourse)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Course
                  </Button>
                </div>

                {showAddCourse && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Create New Course</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleAddCourse} className="space-y-4">
                        {user && (
                          <div>
                            <Label htmlFor="course-image">Course Image</Label>
                            <ImageUpload
                              bucket="portfolios"
                              userId={user.id}
                              onUploadComplete={(url) => setFormData({ ...formData, image_url: url })}
                              currentImage={formData.image_url}
                            />
                          </div>
                        )}
                        <div>
                          <Label htmlFor="course-title">Course Title</Label>
                          <Input id="course-title" name="title" required />
                        </div>
                        <div>
                          <Label htmlFor="course-description">Description</Label>
                          <Textarea id="course-description" name="description" rows={4} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="category">Category</Label>
                            <Input id="category" name="category" placeholder="e.g., Programming, Business, Design" required />
                          </div>
                          <div>
                            <Label htmlFor="level">Level</Label>
                            <Select name="level" defaultValue="all">
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Levels</SelectItem>
                                <SelectItem value="beginner">Beginner</SelectItem>
                                <SelectItem value="intermediate">Intermediate</SelectItem>
                                <SelectItem value="advanced">Advanced</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="price">Price (USD)</Label>
                            <Input id="price" name="price" type="number" step="0.01" defaultValue="0" />
                          </div>
                          <div>
                            <Label htmlFor="duration_hours">Duration (hours)</Label>
                            <Input id="duration_hours" name="duration_hours" type="number" />
                          </div>
                          <div>
                            <Label htmlFor="language">Language</Label>
                            <Input id="language" name="language" defaultValue="English" />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch 
                            id="is_published" 
                            checked={isPublished}
                            onCheckedChange={setIsPublished}
                          />
                          <Label htmlFor="is_published">Publish Course</Label>
                        </div>
                        <input type="hidden" name="image_url" value={formData.image_url} />
                        <Button type="submit">Create Course</Button>
                      </form>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.map((course) => (
                    <Card key={course.id}>
                      {course.image_url && (
                        <img
                          src={course.image_url}
                          alt={course.title}
                          className="w-full h-48 object-cover"
                        />
                      )}
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{course.title}</CardTitle>
                          {course.is_published ? (
                            <Badge variant="default">Published</Badge>
                          ) : (
                            <Badge variant="outline">Draft</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">{course.description}</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Price:</span>
                            <span className="font-medium">
                              {parseFloat(course.price) > 0 ? formatCurrency(course.price) : "Free"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Enrollments:</span>
                            <span>{course.enrollment_count || 0}</span>
                          </div>
                          {course.rating > 0 && (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                              <span>{course.rating.toFixed(1)} ({course.reviews_count || 0} reviews)</span>
                            </div>
                          )}
                          <Badge variant="outline">{course.category}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {courses.length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-muted-foreground mb-4">No courses yet</p>
                      <Button onClick={() => setShowAddCourse(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Your First Course
                      </Button>
                    </CardContent>
                  </Card>
                )}
            </div>
            )}

            {/* Lessons Section */}
            {currentSection === 'lessons' && (
            <div className="mt-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold">Lessons</h2>
                    <p className="text-sm text-muted-foreground">
                      Manage course lessons and content
                    </p>
                  </div>
                  <Button onClick={() => setShowAddLesson(!showAddLesson)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Lesson
                  </Button>
                </div>

                {showAddLesson && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Add New Lesson</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleAddLesson} className="space-y-4">
                        <div>
                          <Label htmlFor="course-select">Course</Label>
                          <Select value={selectedCourse} onValueChange={setSelectedCourse} required>
                            <SelectTrigger id="course-select">
                              <SelectValue placeholder={t("common.selectCourse")} />
                            </SelectTrigger>
                            <SelectContent>
                              {courses.map((course) => (
                                <SelectItem key={course.id} value={course.id}>
                                  {course.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="lesson-title">Lesson Title</Label>
                          <Input id="lesson-title" name="title" required />
                        </div>
                        <div>
                          <Label htmlFor="lesson-description">Description</Label>
                          <Textarea id="lesson-description" name="description" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="lesson_type">Lesson Type</Label>
                            <Select name="lesson_type" defaultValue="video">
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="video">Video</SelectItem>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="quiz">Quiz</SelectItem>
                                <SelectItem value="assignment">Assignment</SelectItem>
                                <SelectItem value="live">Live Session</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                            <Input id="duration_minutes" name="duration_minutes" type="number" />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="video_url">Video URL</Label>
                          <Input id="video_url" name="video_url" type="url" />
                        </div>
                        <div>
                          <Label htmlFor="content">Content/Text</Label>
                          <Textarea id="content" name="content" rows={4} />
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch 
                            id="is_preview" 
                            checked={isPreview}
                            onCheckedChange={setIsPreview}
                          />
                          <Label htmlFor="is_preview">Preview Lesson (free)</Label>
                        </div>
                        <Button type="submit" disabled={!selectedCourse}>Add Lesson</Button>
                      </form>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-4">
                  {courses.map((course) => {
                    const courseLessons = lessons.filter(l => l.course_id === course.id);
                    return (
                      <Card key={course.id}>
                        <CardHeader>
                          <CardTitle>{course.title}</CardTitle>
                          <CardDescription>{courseLessons.length} lessons</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {courseLessons.length === 0 ? (
                            <p className="text-muted-foreground">No lessons yet</p>
                          ) : (
                            <div className="space-y-2">
                              {courseLessons.map((lesson) => (
                                <div key={lesson.id} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-muted-foreground">
                                      {lesson.order_index}.
                                    </span>
                                    <div>
                                      <h4 className="font-medium">{lesson.title}</h4>
                                      <p className="text-sm text-muted-foreground">{lesson.lesson_type}</p>
                                    </div>
                                  </div>
                                  {lesson.is_preview && (
                                    <Badge variant="outline">Preview</Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
            </div>
            )}

      {/* Students Section */}
      {currentSection === 'students' && (
      <div>
                <h2 className="text-2xl font-semibold mb-6">Student Enrollments</h2>
                <div className="space-y-4">
                  {(enrollments || []).map((enrollment) => (
                    <Card key={enrollment.id}>
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold mb-2">
                              {enrollment.courses?.title || "Course"}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              Student: {enrollment.profiles?.display_name || "Unknown"}
                            </p>
                            <p className="text-sm text-muted-foreground mb-2">
                              Enrolled: {new Date(enrollment.enrollment_date).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Progress: {enrollment.progress_percentage}%
                            </p>
                          </div>
                          <Badge variant={
                            enrollment.status === 'completed' ? "default" :
                            enrollment.status === 'in_progress' ? "secondary" :
                            "outline"
                          }>
                            {enrollment.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {(enrollments || []).length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-muted-foreground">No enrollments yet</p>
                    </CardContent>
                  </Card>
                )}
            </div>
      )}
    </DashboardLayout>
  );
}