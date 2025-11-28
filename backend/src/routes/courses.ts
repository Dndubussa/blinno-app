import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get public courses (for Education page)
router.get('/public', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const { data, error } = await supabase
      .from('courses')
      .select(`
        *,
        educator:profiles!courses_educator_id_fkey(
          display_name,
          avatar_url,
          bio
        ),
        enrollments:course_enrollments(count)
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      throw error;
    }

    // Transform to include student count
    const transformed = (data || []).map((course: any) => ({
      ...course,
      students: course.enrollments?.[0]?.count || 0,
    }));

    res.json(transformed);
  } catch (error: any) {
    console.error('Get public courses error:', error);
    res.status(500).json({ error: 'Failed to get courses' });
  }
});

// Get courses for current educator
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('educator_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error: any) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Failed to get courses' });
  }
});

// Create course
router.post('/', authenticate, requireRole('educator'), async (req: AuthRequest, res) => {
  try {
    const { title, description, category, level, price, isPublished } = req.body;
    
    const { data, error } = await supabase
      .from('courses')
      .insert({
        educator_id: req.userId,
        title,
        description: description || null,
        category: category || null,
        level: level || null,
        price: price ? parseFloat(price) : null,
        is_published: isPublished || false,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// Get enrollments
router.get('/enrollments', authenticate, requireRole('educator'), async (req: AuthRequest, res) => {
  try {
    const { data: enrollments, error } = await supabase
      .from('course_enrollments')
      .select(`
        *,
        course:courses!inner(title),
        student:users!course_enrollments_student_id_fkey(email),
        student_profile:profiles!course_enrollments_student_id_fkey(display_name)
      `)
      .eq('course.educator_id', req.userId)
      .order('enrollment_date', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform to match expected format
    const transformed = (enrollments || []).map((ce: any) => ({
      ...ce,
      course_title: ce.course?.title,
      email: ce.student?.email,
      display_name: ce.student_profile?.display_name,
    }));

    res.json(transformed);
  } catch (error: any) {
    console.error('Get enrollments error:', error);
    res.status(500).json({ error: 'Failed to get enrollments' });
  }
});

// Get lessons
router.get('/lessons', authenticate, async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.query;
    
    let query = supabase
      .from('course_lessons')
      .select(`
        *,
        course:courses!inner(educator_id)
      `)
      .eq('course.educator_id', req.userId)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true });

    if (courseId) {
      query = query.eq('course_id', courseId as string);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error: any) {
    console.error('Get lessons error:', error);
    res.status(500).json({ error: 'Failed to get lessons' });
  }
});

// Create lesson
router.post('/lessons', authenticate, requireRole('educator'), async (req: AuthRequest, res) => {
  try {
    const { courseId, title, lessonType, content, videoUrl, isPreview, orderIndex } = req.body;
    
    // Verify course belongs to educator
    const { data: course } = await supabase
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .eq('educator_id', req.userId)
      .single();
    
    if (!course) {
      return res.status(403).json({ error: 'Course not found or access denied' });
    }
    
    const { data, error } = await supabase
      .from('course_lessons')
      .insert({
        course_id: courseId,
        title,
        lesson_type: lessonType || null,
        content: content || null,
        video_url: videoUrl || null,
        is_preview: isPreview || false,
        order_index: orderIndex || null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create lesson error:', error);
    res.status(500).json({ error: 'Failed to create lesson' });
  }
});

export default router;
