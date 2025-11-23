import express from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.js';

const router = express.Router();

/**
 * Get email templates
 */
router.get('/', authenticate, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { category } = req.query;

    let query = 'SELECT * FROM email_templates WHERE is_active = true';
    const params: any[] = [];
    let paramCount = 1;

    if (category) {
      query += ` AND category = $${paramCount++}`;
      params.push(category);
    }

    query += ' ORDER BY category, name';

    const result = await pool.query(query, params);

    res.json(result.rows);
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

    const result = await pool.query(
      'SELECT * FROM email_templates WHERE name = $1 AND is_active = true',
      [name]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);
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

    const result = await pool.query(
      `INSERT INTO email_templates (name, subject, body_html, body_text, category, variables)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, subject, bodyHtml, bodyText || null, category || null, variables ? JSON.stringify(variables) : null]
    );

    res.status(201).json(result.rows[0]);
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

    const result = await pool.query(
      `UPDATE email_templates
       SET subject = COALESCE($1, subject),
           body_html = COALESCE($2, body_html),
           body_text = COALESCE($3, body_text),
           category = COALESCE($4, category),
           variables = COALESCE($5, variables),
           is_active = COALESCE($6, is_active),
           updated_at = now()
       WHERE id = $7
       RETURNING *`,
      [
        subject || null,
        bodyHtml || null,
        bodyText || null,
        category || null,
        variables ? JSON.stringify(variables) : null,
        isActive !== undefined ? isActive : null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);
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

    const result = await pool.query(
      'SELECT * FROM email_templates WHERE name = $1 AND is_active = true',
      [name]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = result.rows[0];

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

