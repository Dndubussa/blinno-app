import express from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Helper function to get dashboard stats
const getDashboardStats = async (userId: string, role: string) => {
  switch (role) {
    case 'lodging':
      const [properties, rooms, bookings, revenue] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM lodging_properties WHERE owner_id = $1', [userId]),
        pool.query('SELECT COUNT(*) as count FROM lodging_rooms r JOIN lodging_properties p ON r.property_id = p.id WHERE p.owner_id = $1', [userId]),
        pool.query("SELECT COUNT(*) as count FROM lodging_bookings b JOIN lodging_rooms r ON b.room_id = r.id JOIN lodging_properties p ON r.property_id = p.id WHERE p.owner_id = $1 AND b.status = 'confirmed'", [userId]),
        pool.query("SELECT COALESCE(SUM(b.total_amount), 0) as total FROM lodging_bookings b JOIN lodging_rooms r ON b.room_id = r.id JOIN lodging_properties p ON r.property_id = p.id WHERE p.owner_id = $1 AND b.status = 'completed'", [userId]),
      ]);
      return {
        totalProperties: parseInt(properties.rows[0].count),
        totalRooms: parseInt(rooms.rows[0].count),
        activeBookings: parseInt(bookings.rows[0].count),
        totalRevenue: parseFloat(revenue.rows[0].total || 0),
      };

    case 'restaurant':
      const [restaurants, menuItems, pendingReservations, todayReservations] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM restaurants WHERE owner_id = $1', [userId]),
        pool.query('SELECT COUNT(*) as count FROM menu_items m JOIN restaurants r ON m.restaurant_id = r.id WHERE r.owner_id = $1', [userId]),
        pool.query("SELECT COUNT(*) as count FROM restaurant_reservations res JOIN restaurants r ON res.restaurant_id = r.id WHERE r.owner_id = $1 AND res.status = 'pending'", [userId]),
        pool.query("SELECT COUNT(*) as count FROM restaurant_reservations res JOIN restaurants r ON res.restaurant_id = r.id WHERE r.owner_id = $1 AND DATE(res.reservation_date) = CURRENT_DATE", [userId]),
      ]);
      return {
        totalRestaurants: parseInt(restaurants.rows[0].count),
        totalMenuItems: parseInt(menuItems.rows[0].count),
        pendingReservations: parseInt(pendingReservations.rows[0].count),
        todayReservations: parseInt(todayReservations.rows[0].count),
      };

    case 'educator':
      const [courses, students, enrollments, courseRevenue] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM courses WHERE educator_id = $1', [userId]),
        pool.query('SELECT COUNT(DISTINCT student_id) as count FROM course_enrollments e JOIN courses c ON e.course_id = c.id WHERE c.educator_id = $1', [userId]),
        pool.query('SELECT COUNT(*) as count FROM course_enrollments e JOIN courses c ON e.course_id = c.id WHERE c.educator_id = $1', [userId]),
        pool.query("SELECT COALESCE(SUM(c.price), 0) as total FROM course_enrollments e JOIN courses c ON e.course_id = c.id WHERE c.educator_id = $1 AND e.payment_status = 'paid'", [userId]),
      ]);
      return {
        totalCourses: parseInt(courses.rows[0].count),
        totalStudents: parseInt(students.rows[0].count),
        totalEnrollments: parseInt(enrollments.rows[0].count),
        totalRevenue: parseFloat(courseRevenue.rows[0].total || 0),
      };

    case 'journalist':
      const [articles, publishedArticles, categories] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM news_articles WHERE journalist_id = $1', [userId]),
        pool.query("SELECT COUNT(*) as count FROM news_articles WHERE journalist_id = $1 AND is_published = true", [userId]),
        pool.query('SELECT COUNT(*) as count FROM news_categories', []),
      ]);
      return {
        totalArticles: parseInt(articles.rows[0].count),
        publishedArticles: parseInt(publishedArticles.rows[0].count),
        totalCategories: parseInt(categories.rows[0].count),
      };

    case 'artisan':
      const [services, artisanBookings, completedJobs] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM artisan_services WHERE artisan_id = $1', [userId]),
        pool.query("SELECT COUNT(*) as count FROM artisan_bookings WHERE artisan_id = $1 AND status = 'confirmed'", [userId]),
        pool.query("SELECT COUNT(*) as count FROM artisan_bookings WHERE artisan_id = $1 AND status = 'completed'", [userId]),
      ]);
      return {
        totalServices: parseInt(services.rows[0].count),
        activeBookings: parseInt(artisanBookings.rows[0].count),
        completedJobs: parseInt(completedJobs.rows[0].count),
      };

    case 'employer':
      const [jobPostings, applications, activeJobs] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM job_postings WHERE employer_id = $1', [userId]),
        pool.query("SELECT COUNT(*) as count FROM job_applications ja JOIN job_postings jp ON ja.job_posting_id = jp.id WHERE jp.employer_id = $1 AND ja.status = 'pending'", [userId]),
        pool.query("SELECT COUNT(*) as count FROM job_postings WHERE employer_id = $1 AND is_active = true", [userId]),
      ]);
      return {
        totalJobPostings: parseInt(jobPostings.rows[0].count),
        pendingApplications: parseInt(applications.rows[0].count),
        activeJobs: parseInt(activeJobs.rows[0].count),
      };

    case 'event_organizer':
      const [events, registrations, upcomingEvents] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM organized_events WHERE organizer_id = $1', [userId]),
        pool.query('SELECT COUNT(*) as count FROM event_registrations er JOIN organized_events e ON er.event_id = e.id WHERE e.organizer_id = $1', [userId]),
        pool.query("SELECT COUNT(*) as count FROM organized_events WHERE organizer_id = $1 AND start_date > NOW() AND status = 'published'", [userId]),
      ]);
      return {
        totalEvents: parseInt(events.rows[0].count),
        totalRegistrations: parseInt(registrations.rows[0].count),
        upcomingEvents: parseInt(upcomingEvents.rows[0].count),
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
    const roleCheck = await pool.query(
      'SELECT role FROM user_roles WHERE user_id = $1 AND role = $2',
      [req.userId, role]
    );

    if (roleCheck.rows.length === 0) {
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

