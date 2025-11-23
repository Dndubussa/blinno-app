# Dashboard Migration Guide

This document outlines the changes needed to migrate all dashboards from Supabase to the new API-based architecture with role-based access control.

## Completed ✅

1. **Backend API Routes Created:**
   - `/api/courses` - Educator endpoints
   - `/api/news` - Journalist endpoints
   - `/api/artisan` - Artisan endpoints
   - `/api/jobs` - Employer endpoints
   - `/api/events` - Event Organizer endpoints
   - `/api/lodging` - Extended with GET endpoints
   - `/api/restaurants` - Extended with GET endpoints

2. **Frontend API Client:**
   - Added role-specific API methods for all dashboard types
   - Created `roleCheck.ts` utility for role verification

3. **Sidebar Navigation:**
   - Fixed role extraction from `roles` array
   - Added deduplication logic for navigation items

4. **LodgingDashboard:**
   - Migrated to use new API endpoints
   - Added role-based access control
   - Removed Supabase dependencies

## Remaining Work 🔄

### Dashboard Pages to Update:

1. **RestaurantDashboard.tsx**
   - Replace `supabase.from("restaurants")` with `api.getRestaurants()`
   - Replace `supabase.from("menu_items")` with `api.getMenuItems()`
   - Replace `supabase.from("restaurant_reservations")` with `api.getRestaurantReservations()`
   - Use `api.createRestaurant()` and `api.createMenuItem()`
   - Add role check using `hasRole('restaurant')`

2. **EducatorDashboard.tsx**
   - Replace Supabase calls with:
     - `api.getCourses()`
     - `api.getCourseEnrollments()`
     - `api.getLessons()`
     - `api.createCourse()`
     - `api.createLesson()`
   - Add role check using `hasRole('educator')`

3. **JournalistDashboard.tsx**
   - Replace Supabase calls with:
     - `api.getNewsArticles()`
     - `api.getNewsCategories()`
     - `api.createNewsArticle()`
   - Add role check using `hasRole('journalist')`

4. **ArtisanDashboard.tsx**
   - Replace Supabase calls with:
     - `api.getArtisanServices()`
     - `api.getArtisanBookings()`
     - `api.createArtisanService()`
   - Add role check using `hasRole('artisan')`

5. **EmployerDashboard.tsx**
   - Replace Supabase calls with:
     - `api.getJobPostings()`
     - `api.getJobApplications()`
     - `api.createJobPosting()`
   - Add role check using `hasRole('employer')`

6. **EventOrganizerDashboard.tsx**
   - Replace Supabase calls with:
     - `api.getOrganizedEvents()`
     - `api.getEventRegistrations()`
     - `api.createOrganizedEvent()`
   - Add role check using `hasRole('event_organizer')`

7. **FreelancerDashboard.tsx**
   - Replace Supabase calls with:
     - `api.getFreelancerProjects()`
     - `api.getFreelancerProposals()`
     - `api.getFreelancerClients()`
     - `api.getFreelancerInvoices()`
     - `api.getFreelancerServices()`
   - Add role check using `hasRole('freelancer')`

### Pattern to Follow:

```typescript
// 1. Import utilities
import { api } from "@/lib/api";
import { hasRole, getPrimaryRole } from "@/lib/roleCheck";

// 2. Remove Supabase import
// import { supabase } from "@/integrations/supabase/client";

// 3. Update role check
const checkRole = async () => {
  if (!user || !profile) return;
  
  const primaryRole = getPrimaryRole(profile);
  const userHasRole = await hasRole('your_role_here');

  if (!userHasRole && primaryRole !== 'your_role_here') {
    toast({
      title: "Access Denied",
      description: "This dashboard is only available for [role].",
      variant: "destructive",
    });
    navigate("/dashboard");
    return;
  }

  setIsRole(true);
};

// 4. Update fetchData
const fetchData = async () => {
  if (!user) return;
  
  try {
    const [data1, data2, statsData] = await Promise.all([
      api.getYourData1(),
      api.getYourData2(),
      api.getDashboardStats('your_role'),
    ]);
    
    setData1(data1 || []);
    setData2(data2 || []);
    
    if (statsData) {
      setStats(statsData);
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

// 5. Update create/update handlers
const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  
  try {
    await api.createYourResource({
      // map form data
    });
    toast({ title: "Success", description: "Created!" });
    fetchData();
  } catch (error: any) {
    toast({ 
      title: "Error", 
      description: error.message || "Failed to create", 
      variant: "destructive" 
    });
  }
};
```

## API Endpoints Reference

### Dashboard Stats
- `GET /api/dashboards/:role/stats` - Get role-specific dashboard statistics

### Lodging
- `GET /api/lodging/properties` - Get properties
- `POST /api/lodging/properties` - Create property
- `GET /api/lodging/rooms` - Get rooms
- `POST /api/lodging/rooms` - Create room
- `GET /api/lodging/bookings` - Get bookings

### Restaurants
- `GET /api/restaurants` - Get restaurants
- `POST /api/restaurants` - Create restaurant
- `GET /api/restaurants/menu-items` - Get menu items
- `POST /api/restaurants/menu-items` - Create menu item
- `GET /api/restaurants/reservations` - Get reservations

### Courses (Educator)
- `GET /api/courses` - Get courses
- `POST /api/courses` - Create course
- `GET /api/courses/enrollments` - Get enrollments
- `GET /api/courses/lessons` - Get lessons
- `POST /api/courses/lessons` - Create lesson

### News (Journalist)
- `GET /api/news/articles` - Get articles
- `POST /api/news/articles` - Create article
- `GET /api/news/categories` - Get categories

### Artisan
- `GET /api/artisan/services` - Get services
- `POST /api/artisan/services` - Create service
- `GET /api/artisan/bookings` - Get bookings

### Jobs (Employer)
- `GET /api/jobs/postings` - Get job postings
- `POST /api/jobs/postings` - Create job posting
- `GET /api/jobs/applications` - Get applications

### Events (Event Organizer)
- `GET /api/events/organized` - Get events
- `POST /api/events/organized` - Create event
- `GET /api/events/registrations` - Get registrations

### Freelancer
- `GET /api/freelancer/projects` - Get projects
- `GET /api/freelancer/proposals` - Get proposals
- `GET /api/freelancer/clients` - Get clients
- `GET /api/freelancer/invoices` - Get invoices
- `GET /api/freelancer/services` - Get services
- `GET /api/freelancer/stats` - Get stats

## Testing Checklist

For each dashboard:
- [ ] Role check works correctly
- [ ] Data fetching works
- [ ] Create operations work
- [ ] Update operations work (if applicable)
- [ ] Delete operations work (if applicable)
- [ ] Stats display correctly
- [ ] Error handling works
- [ ] Loading states work
- [ ] Navigation works
- [ ] Sidebar shows correct role-specific items

