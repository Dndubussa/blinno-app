import express from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get all services from different providers
router.get('/', async (req, res) => {
  try {
    const { category, location, serviceType, search } = req.query;

    // Build query for freelancer services
    let freelancerQuery = `
      SELECT 
        fs.id,
        fs.user_id as creator_id,
        fs.title,
        fs.description,
        fs.category,
        fs.location,
        fs.hourly_rate as price,
        'hourly' as pricing_type,
        0 as rating,
        0 as reviews_count,
        fs.created_at,
        fs.updated_at,
        p.display_name,
        p.avatar_url,
        'freelancer' as service_type
      FROM freelancer_services fs
      LEFT JOIN profiles p ON fs.user_id = p.user_id
      WHERE fs.is_active = true
    `;

    // Build query for artisan services
    let artisanQuery = `
      SELECT 
        asv.id,
        asv.user_id as creator_id,
        asv.title,
        asv.description,
        asv.category,
        asv.location,
        asv.hourly_rate as price,
        'hourly' as pricing_type,
        0 as rating,
        0 as reviews_count,
        asv.created_at,
        asv.updated_at,
        p.display_name,
        p.avatar_url,
        'artisan' as service_type
      FROM artisan_services asv
      LEFT JOIN profiles p ON asv.user_id = p.user_id
      WHERE asv.status = 'active'
    `;

    // Build query for restaurant services (menu items)
    let restaurantQuery = `
      SELECT 
        mi.id,
        r.owner_id as creator_id,
        mi.name as title,
        mi.description,
        'Food & Dining' as category,
        r.city as location,
        mi.price,
        'fixed' as pricing_type,
        0 as rating,
        0 as reviews_count,
        mi.created_at,
        mi.updated_at,
        r.name as display_name,
        null as avatar_url,
        'restaurant' as service_type
      FROM menu_items mi
      JOIN restaurants r ON mi.restaurant_id = r.id
      WHERE mi.is_available = true
    `;

    // Build query for event services
    let eventQuery = `
      SELECT 
        e.id,
        e.organizer_id as creator_id,
        e.title,
        e.description,
        'Events' as category,
        e.location,
        e.ticket_price as price,
        'fixed' as pricing_type,
        0 as rating,
        0 as reviews_count,
        e.created_at,
        e.updated_at,
        p.display_name,
        p.avatar_url,
        'event' as service_type
      FROM events e
      LEFT JOIN profiles p ON e.organizer_id = p.user_id
      WHERE e.status = 'published'
    `;

    // Build query for lodging services (rooms)
    let lodgingQuery = `
      SELECT 
        lr.id,
        lp.owner_id as creator_id,
        CONCAT(lp.name, ' - ', lr.room_type) as title,
        lr.description,
        'Lodging' as category,
        lp.location,
        lr.price_per_night as price,
        'daily' as pricing_type,
        0 as rating,
        0 as reviews_count,
        lr.created_at,
        lr.updated_at,
        lp.name as display_name,
        null as avatar_url,
        'lodging' as service_type
      FROM lodging_rooms lr
      JOIN lodging_properties lp ON lr.property_id = lp.id
      WHERE lr.availability_status = 'available'
    `;

    // Add filters to all queries
    const filters = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (category && category !== 'all') {
      filters.push(`category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    if (location && location !== 'all') {
      filters.push(`location = $${paramIndex}`);
      params.push(location);
      paramIndex++;
    }

    if (serviceType && serviceType !== 'all') {
      filters.push(`service_type = $${paramIndex}`);
      params.push(serviceType);
      paramIndex++;
    }

    if (search) {
      filters.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const filterClause = filters.length > 0 ? ` AND ${filters.join(' AND ')}` : '';

    freelancerQuery += filterClause;
    artisanQuery += filterClause;
    restaurantQuery += filterClause;
    eventQuery += filterClause;
    lodgingQuery += filterClause;

    // Combine all queries
    const combinedQuery = `
      ${freelancerQuery}
      UNION ALL
      ${artisanQuery}
      UNION ALL
      ${restaurantQuery}
      UNION ALL
      ${eventQuery}
      UNION ALL
      ${lodgingQuery}
      ORDER BY created_at DESC
      LIMIT 100
    `;

    const result = await pool.query(combinedQuery, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get services error:', error);
    res.status(500).json({ error: 'Failed to get services' });
  }
});

export default router;