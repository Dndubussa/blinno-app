import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Helper function to get dashboard stats
const getDashboardStats = async (userId: string, role: string) => {
  switch (role) {
    case 'lodging':
      const [properties, rooms, bookings, revenue] = await Promise.all([
        supabase.from('lodging_properties').select('*', { count: 'exact', head: true }).eq('owner_id', userId),
        supabase.from('lodging_rooms').select('*, lodging_properties!inner(owner_id)').eq('lodging_properties.owner_id', userId),
        supabase.from('lodging_bookings').select('*, lodging_rooms!inner(lodging_properties!inner(owner_id))').eq('lodging_rooms.lodging_properties.owner_id', userId).eq('status', 'confirmed'),
        supabase.from('lodging_bookings').select('total_amount').eq('status', 'completed'),
      ]);
      
      // Calculate revenue
      let totalRevenue = 0;
      if (revenue.data) {
        totalRevenue = revenue.data.reduce((sum: number, b: any) => sum + (parseFloat(b.total_amount) || 0), 0);
      }

      return {
        totalProperties: properties.count || 0,
        totalRooms: rooms.data?.length || 0,
        activeBookings: bookings.data?.length || 0,
        totalRevenue,
      };

    case 'restaurant':
      const [restaurants, menuItems, pendingReservations, todayReservations] = await Promise.all([
        supabase.from('restaurants').select('*', { count: 'exact', head: true }).eq('owner_id', userId),
        supabase.from('menu_items').select('*, restaurants!inner(owner_id)').eq('restaurants.owner_id', userId),
        supabase.from('restaurant_reservations').select('*, restaurants!inner(owner_id)').eq('restaurants.owner_id', userId).eq('status', 'pending'),
        supabase.from('restaurant_reservations').select('*, restaurants!inner(owner_id)').eq('restaurants.owner_id', userId).gte('reservation_date', new Date().toISOString().split('T')[0]),
      ]);
      
      return {
        totalRestaurants: restaurants.count || 0,
        totalMenuItems: menuItems.data?.length || 0,
        pendingReservations: pendingReservations.data?.length || 0,
        todayReservations: todayReservations.data?.length || 0,
      };

    case 'educator':
      const [courses, enrollments, courseRevenue] = await Promise.all([
        supabase.from('courses').select('*', { count: 'exact', head: true }).eq('educator_id', userId),
        supabase.from('course_enrollments').select('*, courses!inner(educator_id)').eq('courses.educator_id', userId),
        supabase.from('course_enrollments').select('*, courses!inner(educator_id, price)').eq('courses.educator_id', userId).eq('payment_status', 'paid'),
      ]);
      
      let totalRevenue = 0;
      if (courseRevenue.data) {
        totalRevenue = courseRevenue.data.reduce((sum: number, e: any) => sum + (parseFloat(e.courses?.price) || 0), 0);
      }

      const uniqueStudents = new Set(enrollments.data?.map((e: any) => e.student_id) || []);
      
      return {
        totalCourses: courses.count || 0,
        totalStudents: uniqueStudents.size,
        totalEnrollments: enrollments.data?.length || 0,
        totalRevenue,
      };

    case 'journalist':
      const [articles, publishedArticles, categories] = await Promise.all([
        supabase.from('news_articles').select('*', { count: 'exact', head: true }).eq('journalist_id', userId),
        supabase.from('news_articles').select('*', { count: 'exact', head: true }).eq('journalist_id', userId).eq('is_published', true),
        supabase.from('news_categories').select('*', { count: 'exact', head: true }),
      ]);
      
      return {
        totalArticles: articles.count || 0,
        publishedArticles: publishedArticles.count || 0,
        totalCategories: categories.count || 0,
      };

    case 'artisan':
      const [services, artisanBookings, completedJobs] = await Promise.all([
        supabase.from('artisan_services').select('*', { count: 'exact', head: true }).eq('artisan_id', userId),
        supabase.from('artisan_bookings').select('*', { count: 'exact', head: true }).eq('artisan_id', userId).eq('status', 'confirmed'),
        supabase.from('artisan_bookings').select('*', { count: 'exact', head: true }).eq('artisan_id', userId).eq('status', 'completed'),
      ]);
      
      return {
        totalServices: services.count || 0,
        activeBookings: artisanBookings.count || 0,
        completedJobs: completedJobs.count || 0,
      };

    case 'employer':
      const [jobPostings, applications, activeJobs] = await Promise.all([
        supabase.from('job_postings').select('*', { count: 'exact', head: true }).eq('employer_id', userId),
        supabase.from('job_applications').select('*, job_postings!inner(employer_id)').eq('job_postings.employer_id', userId).eq('status', 'pending'),
        supabase.from('job_postings').select('*', { count: 'exact', head: true }).eq('employer_id', userId).eq('is_active', true),
      ]);
      
      return {
        totalJobPostings: jobPostings.count || 0,
        pendingApplications: applications.data?.length || 0,
        activeJobs: activeJobs.count || 0,
      };

    case 'event_organizer':
      const [events, registrations, upcomingEvents] = await Promise.all([
        supabase.from('organized_events').select('*', { count: 'exact', head: true }).eq('organizer_id', userId),
        supabase.from('event_registrations').select('*, organized_events!inner(organizer_id)').eq('organized_events.organizer_id', userId),
        supabase.from('organized_events').select('*', { count: 'exact', head: true }).eq('organizer_id', userId).eq('status', 'published').gt('start_date', new Date().toISOString()),
      ]);
      
      return {
        totalEvents: events.count || 0,
        totalRegistrations: registrations.data?.length || 0,
        upcomingEvents: upcomingEvents.count || 0,
      };

    default:
      return {};
  }
};

// Generic dashboard route
router.get('/:role/stats', authenticate, async (req: AuthRequest, res) => {
  try {
    const { role } = req.params;
    
    // Check if user has the role
    const { data: roleCheck } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', req.userId)
      .eq('role', role)
      .single();

    if (!roleCheck) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const stats = await getDashboardStats(req.userId!, role);
    res.json(stats);
  } catch (error: any) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
});

export default router;
