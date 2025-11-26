import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.js';

const router = express.Router();

/**
 * Get email templates
 */
router.get('/', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { category } = req.query;

    let query = supabase
      .from('email_templates')
      .select('*')
      .eq('is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (category) {
      query = query.eq('category', category as string);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error: any) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

/**
 * Get email template by name
 */
router.get('/:name', async (req, res) => {
  try {
    const { name } = req.params;

    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('name', name)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(data);
  } catch (error: any) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Failed to get template' });
  }
});

/**
 * Create email template (admin only)
 */
router.post('/', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { name, subject, bodyHtml, bodyText, category, variables } = req.body;

    if (!name || !subject || !bodyHtml) {
      return res.status(400).json({ error: 'Name, subject, and body HTML are required' });
    }

    const { data, error } = await supabase
      .from('email_templates')
      .insert({
        name,
        subject,
        body_html: bodyHtml,
        body_text: bodyText || null,
        category: category || null,
        variables: variables ? JSON.stringify(variables) : null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

/**
 * Update email template (admin only)
 */
router.put('/:id', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { subject, bodyHtml, bodyText, category, variables, isActive } = req.body;

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (subject !== undefined) updates.subject = subject;
    if (bodyHtml !== undefined) updates.body_html = bodyHtml;
    if (bodyText !== undefined) updates.body_text = bodyText;
    if (category !== undefined) updates.category = category;
    if (variables !== undefined) updates.variables = JSON.stringify(variables);
    if (isActive !== undefined) updates.is_active = isActive;

    const { data, error } = await supabase
      .from('email_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(data);
  } catch (error: any) {
    console.error('Update template error:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

/**
 * Render email template with variables
 */
router.post('/:name/render', async (req, res) => {
  try {
    const { name } = req.params;
    const { variables } = req.body;

    const { data: template, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('name', name)
      .eq('is_active', true)
      .single();

    if (error || !template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Replace variables in subject and body
    let subject = template.subject;
    let bodyHtml = template.body_html;
    let bodyText = template.body_text;

    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, String(value));
        bodyHtml = bodyHtml.replace(regex, String(value));
        if (bodyText) {
          bodyText = bodyText.replace(regex, String(value));
        }
      });
    }

    res.json({
      subject,
      bodyHtml,
      bodyText,
    });
  } catch (error: any) {
    console.error('Render template error:', error);
    res.status(500).json({ error: 'Failed to render template' });
  }
});

export default router;
