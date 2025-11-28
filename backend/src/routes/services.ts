import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Get all services from different providers
router.get('/', async (req, res) => {
  try {
    const { category, location, serviceType, search } = req.query;

    // Fetch from each service type separately
    const promises: Promise<any>[] = [];

    // Freelancer services
    if (!serviceType || serviceType === 'freelancer' || serviceType === 'all') {
      let query = supabase
        .from('freelancer_services')
        .select(`
          id,
          user_id,
          title,
          description,
          category,
          location,
          hourly_rate,
          created_at,
          updated_at,
          profiles!freelancer_services_user_id_fkey(display_name, avatar_url)
        `)
        .eq('is_active', true);

      if (category && category !== 'all') {
        query = query.eq('category', category as string);
      }
      if (location && location !== 'all') {
        query = query.eq('location', location as string);
      }
      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      promises.push(
        Promise.resolve(query).then(({ data }) => (data || []).map((fs: any) => ({
          id: fs.id,
          creator_id: fs.user_id,
          title: fs.title,
          description: fs.description,
          category: fs.category,
          location: fs.location,
          price: fs.hourly_rate,
          pricing_type: 'hourly',
          rating: 0,
          reviews_count: 0,
          created_at: fs.created_at,
          updated_at: fs.updated_at,
          display_name: fs.profiles?.display_name,
          avatar_url: fs.profiles?.avatar_url,
          service_type: 'freelancer',
        })))
      );
    }

    // Artisan services
    if (!serviceType || serviceType === 'artisan' || serviceType === 'all') {
      let query = supabase
        .from('artisan_services')
        .select(`
          id,
          user_id,
          title,
          description,
          category,
          location,
          hourly_rate,
          created_at,
          updated_at,
          profiles!artisan_services_user_id_fkey(display_name, avatar_url)
        `)
        .eq('status', 'active');

      if (category && category !== 'all') {
        query = query.eq('category', category as string);
      }
      if (location && location !== 'all') {
        query = query.eq('location', location as string);
      }
      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      promises.push(
        Promise.resolve(query).then(({ data }) => (data || []).map((as: any) => ({
          id: as.id,
          creator_id: as.user_id,
          title: as.title,
          description: as.description,
          category: as.category,
          location: as.location,
          price: as.hourly_rate,
          pricing_type: 'hourly',
          rating: 0,
          reviews_count: 0,
          created_at: as.created_at,
          updated_at: as.updated_at,
          display_name: as.profiles?.display_name,
          avatar_url: as.profiles?.avatar_url,
          service_type: 'artisan',
        })))
      );
    }

    // Restaurant services (menu items)
    if (!serviceType || serviceType === 'restaurant' || serviceType === 'all') {
      let query = supabase
        .from('menu_items')
        .select(`
          id,
          restaurant_id,
          name,
          description,
          price,
          created_at,
          updated_at,
          restaurants!menu_items_restaurant_id_fkey(owner_id, name, city)
        `)
        .eq('is_available', true);

      if (location && location !== 'all') {
        query = query.eq('restaurants.city', location as string);
      }
      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
      }

      promises.push(
        Promise.resolve(query).then(({ data }) => (data || []).map((mi: any) => ({
          id: mi.id,
          creator_id: mi.restaurants?.owner_id,
          title: mi.name,
          description: mi.description,
          category: 'Food & Dining',
          location: mi.restaurants?.city,
          price: mi.price,
          pricing_type: 'fixed',
          rating: 0,
          reviews_count: 0,
          created_at: mi.created_at,
          updated_at: mi.updated_at,
          display_name: mi.restaurants?.name,
          avatar_url: null,
          service_type: 'restaurant',
        })))
      );
    }

    // Event services
    if (!serviceType || serviceType === 'event' || serviceType === 'all') {
      let query = supabase
        .from('events')
        .select(`
          id,
          organizer_id,
          title,
          description,
          location,
          ticket_price,
          created_at,
          updated_at,
          profiles!events_organizer_id_fkey(display_name, avatar_url)
        `)
        .eq('status', 'published');

      if (location && location !== 'all') {
        query = query.eq('location', location as string);
      }
      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      promises.push(
        Promise.resolve(query).then(({ data }) => (data || []).map((e: any) => ({
          id: e.id,
          creator_id: e.organizer_id,
          title: e.title,
          description: e.description,
          category: 'Events',
          location: e.location,
          price: e.ticket_price,
          pricing_type: 'fixed',
          rating: 0,
          reviews_count: 0,
          created_at: e.created_at,
          updated_at: e.updated_at,
          display_name: e.profiles?.display_name,
          avatar_url: e.profiles?.avatar_url,
          service_type: 'event',
        })))
      );
    }

    // Lodging services (rooms)
    if (!serviceType || serviceType === 'lodging' || serviceType === 'all') {
      let query = supabase
        .from('lodging_rooms')
        .select(`
          id,
          property_id,
          room_type,
          description,
          price_per_night,
          created_at,
          updated_at,
          lodging_properties!lodging_rooms_property_id_fkey(owner_id, name, location)
        `)
        .eq('availability_status', 'available');

      if (location && location !== 'all') {
        query = query.eq('lodging_properties.location', location as string);
      }
      if (search) {
        query = query.or(`room_type.ilike.%${search}%,description.ilike.%${search}%`);
      }

      promises.push(
        Promise.resolve(query).then(({ data }) => (data || []).map((lr: any) => ({
          id: lr.id,
          creator_id: lr.lodging_properties?.owner_id,
          title: `${lr.lodging_properties?.name} - ${lr.room_type}`,
          description: lr.description,
          category: 'Lodging',
          location: lr.lodging_properties?.location,
          price: lr.price_per_night,
          pricing_type: 'daily',
          rating: 0,
          reviews_count: 0,
          created_at: lr.created_at,
          updated_at: lr.updated_at,
          display_name: lr.lodging_properties?.name,
          avatar_url: null,
          service_type: 'lodging',
        })))
      );
    }

    // Execute all queries in parallel
    const results = await Promise.all(promises);
    
    // Combine and sort all results
    const allServices = results.flat().sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Apply category filter if needed (already filtered in queries, but double-check)
    const filtered = category && category !== 'all' 
      ? allServices.filter(s => s.category === category)
      : allServices;

    // Limit to 100
    res.json(filtered.slice(0, 100));
  } catch (error: any) {
    console.error('Get services error:', error);
    res.status(500).json({ error: 'Failed to get services' });
  }
});

export default router;
