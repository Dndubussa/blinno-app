import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get job postings for current employer
router.get('/postings', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('job_postings')
      .select('*')
      .eq('employer_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data || []);
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
    
    const { data, error } = await supabase
      .from('job_postings')
      .insert({
        employer_id: req.userId,
        title,
        description,
        company_name: companyName,
        location,
        job_type: jobType,
        category,
        skills_required: skillsRequired || [],
        salary_min: salaryMin ? parseFloat(salaryMin) : null,
        salary_max: salaryMax ? parseFloat(salaryMax) : null,
        salary_currency: salaryCurrency || 'TSh',
        is_remote: isRemote || false,
        application_deadline: applicationDeadline || null,
        application_url: applicationUrl || null,
        is_active: isActive !== undefined ? isActive : true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create job posting error:', error);
    res.status(500).json({ error: 'Failed to create job posting' });
  }
});

// Get applications
router.get('/applications', authenticate, requireRole('employer'), async (req: AuthRequest, res) => {
  try {
    const { data: applications, error } = await supabase
      .from('job_applications')
      .select(`
        *,
        job:job_postings!inner(title, company_name),
        applicant:users!job_applications_applicant_id_fkey(email),
        applicant_profile:profiles!job_applications_applicant_id_fkey(display_name)
      `)
      .eq('job.employer_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform to match expected format
    const transformed = (applications || []).map((ja: any) => ({
      ...ja,
      job_title: ja.job?.title,
      company_name: ja.job?.company_name,
      email: ja.applicant?.email,
      display_name: ja.applicant_profile?.display_name,
    }));

    res.json(transformed);
  } catch (error: any) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Failed to get applications' });
  }
});

export default router;
