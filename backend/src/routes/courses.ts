import express from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get courses for current educator
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM courses WHERE educator_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Failed to get courses' });
  }
});

// Create course
router.post('/', authenticate, requireRole('educator'), async (req: AuthRequest, res) => {
  try {
    const { title, description, category, level, price, isPublished } = req.body;
    const result = await pool.query(
      `INSERT INTO courses (educator_id, title, description, category, level, price, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.userId, title, description || null, category || null, level || null, price ? parseFloat(price) : null, isPublished || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// Get enrollments
router.get('/enrollments', authenticate, requireRole('educator'), async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT ce.*, c.title as course_title, u.email, p.display_name
       FROM course_enrollments ce
       JOIN courses c ON ce.course_id = c.id
       JOIN users u ON ce.student_id = u.id
       LEFT JOIN profiles p ON ce.student_id = p.user_id
       WHERE c.educator_id = $1
       ORDER BY ce.enrollment_date DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get enrollments error:', error);
    res.status(500).json({ error: 'Failed to get enrollments' });
  }
});

// Get lessons
router.get('/lessons', authenticate, async (req: AuthRequest, res) => {
  try {
    const { courseId } = req.query;
    let query = `
      SELECT cl.*, c.educator_id
      FROM course_lessons cl
      JOIN courses c ON cl.course_id = c.id
      WHERE c.educator_id = $1
    `;
    const params: any[] = [req.userId];
    
    if (courseId) {
      query += ' AND cl.course_id = $2';
      params.push(courseId);
    }
    
    query += ' ORDER BY cl.order_index, cl.created_at';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
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
    const courseCheck = await pool.query(
      'SELECT id FROM courses WHERE id = $1 AND educator_id = $2',
      [courseId, req.userId]
    );
    
    if (courseCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Course not found or access denied' });
    }
    
    const result = await pool.query(
      `INSERT INTO course_lessons (course_id, title, lesson_type, content, video_url, is_preview, order_index)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [courseId, title, lessonType || null, content || null, videoUrl || null, isPreview || false, orderIndex || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create lesson error:', error);
    res.status(500).json({ error: 'Failed to create lesson' });
  }
});

export default router;

