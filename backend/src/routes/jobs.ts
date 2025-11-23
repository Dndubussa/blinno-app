import express from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get job postings for current employer
router.get('/postings', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM job_postings WHERE employer_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get job postings error:', error);
    res.status(500).json({ error: 'Failed to get job postings' });
  }
});

// Create job posting
router.post('/postings', authenticate, requireRole('employer'), async (req: AuthRequest, res) => {
  try {
    const {
      title, description, companyName, location, jobType, category,
      skillsRequired, salaryMin, salaryMax, salaryCurrency, isRemote,
      applicationDeadline, applicationUrl, isActive
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO job_postings (
        employer_id, title, description, company_name, location, job_type, category,
        skills_required, salary_min, salary_max, salary_currency, is_remote,
        application_deadline, application_url, is_active
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        req.userId,
        title,
        description,
        companyName,
        location,
        jobType,
        category,
        skillsRequired || [],
        salaryMin ? parseFloat(salaryMin) : null,
        salaryMax ? parseFloat(salaryMax) : null,
        salaryCurrency || 'TSh',
        isRemote || false,
        applicationDeadline || null,
        applicationUrl || null,
        isActive !== undefined ? isActive : true,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create job posting error:', error);
    res.status(500).json({ error: 'Failed to create job posting' });
  }
});

// Get applications
router.get('/applications', authenticate, requireRole('employer'), async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT ja.*, 
              jp.title as job_title,
              jp.company_name,
              u.email,
              p.display_name
       FROM job_applications ja
       JOIN job_postings jp ON ja.job_posting_id = jp.id
       JOIN users u ON ja.applicant_id = u.id
       LEFT JOIN profiles p ON ja.applicant_id = p.user_id
       WHERE jp.employer_id = $1
       ORDER BY ja.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Failed to get applications' });
  }
});

export default router;

