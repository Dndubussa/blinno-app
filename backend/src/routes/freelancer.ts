import express from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and freelancer role
router.use(authenticate);
router.use(requireRole('freelancer'));

// Projects
router.get('/projects', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM projects WHERE freelancer_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to get projects' });
  }
});

router.post('/projects', async (req: AuthRequest, res) => {
  try {
    const { title, description, billingType, budget, status, startDate, endDate } = req.body;
    const result = await pool.query(
      `INSERT INTO projects (freelancer_id, title, description, billing_type, budget, status, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [req.userId, title, description, billingType, budget ? parseFloat(budget) : null, status || 'draft', startDate || null, endDate || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

router.put('/projects/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    ['title', 'description', 'billing_type', 'budget', 'status', 'start_date', 'end_date'].forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramCount++}`);
        values.push(req.body[field]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id, req.userId);
    const result = await pool.query(
      `UPDATE projects SET ${updates.join(', ')}, updated_at = now()
       WHERE id = $${paramCount} AND freelancer_id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

router.delete('/projects/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM projects WHERE id = $1 AND freelancer_id = $2', [id, req.userId]);
    res.json({ message: 'Project deleted' });
  } catch (error: any) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Proposals
router.get('/proposals', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM proposals WHERE freelancer_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get proposals error:', error);
    res.status(500).json({ error: 'Failed to get proposals' });
  }
});

router.post('/proposals', async (req: AuthRequest, res) => {
  try {
    const { projectId, clientId, message, proposedRate, status } = req.body;

    // Import client service
    const { ensureClientExists } = await import('../services/clientService.js');

    let finalClientId = clientId;

    // If projectId is provided, get the project to find the client
    if (projectId && !clientId) {
      const projectResult = await pool.query(
        'SELECT client_id FROM projects WHERE id = $1',
        [projectId]
      );
      if (projectResult.rows.length > 0) {
        const projectClientId = projectResult.rows[0].client_id;
        if (projectClientId) {
          // Get user_id from client
          const clientResult = await pool.query(
            'SELECT user_id FROM clients WHERE id = $1',
            [projectClientId]
          );
          if (clientResult.rows.length > 0 && clientResult.rows[0].user_id) {
            // Auto-create client if needed
            const createdClientId = await ensureClientExists({
              freelancerId: req.userId,
              userId: clientResult.rows[0].user_id,
            });
            if (createdClientId) {
              finalClientId = createdClientId;
            } else {
              finalClientId = projectClientId;
            }
          } else {
            finalClientId = projectClientId;
          }
        }
      }
    }

    // If proposal is being accepted, ensure client exists
    if (status === 'accepted' && finalClientId) {
      const clientResult = await pool.query(
        'SELECT user_id FROM clients WHERE id = $1',
        [finalClientId]
      );
      if (clientResult.rows.length > 0 && clientResult.rows[0].user_id) {
        await ensureClientExists({
          freelancerId: req.userId,
          userId: clientResult.rows[0].user_id,
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO proposals (project_id, freelancer_id, client_id, message, proposed_rate, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [projectId, req.userId, finalClientId, message, proposedRate ? parseFloat(proposedRate) : null, status || 'pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create proposal error:', error);
    res.status(500).json({ error: 'Failed to create proposal' });
  }
});

// Clients
router.get('/clients', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, 
       p.display_name, p.avatar_url, u.email as user_email,
       (SELECT COUNT(*) FROM projects WHERE client_id = c.id) as project_count,
       (SELECT COUNT(*) FROM invoices WHERE client_id = c.id) as invoice_count
       FROM clients c
       LEFT JOIN users u ON c.user_id = u.id
       LEFT JOIN profiles p ON c.user_id = p.user_id
       WHERE c.freelancer_id = $1 
       ORDER BY c.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Failed to get clients' });
  }
});

router.post('/clients', async (req: AuthRequest, res) => {
  try {
    const { userId, companyName, contactName, email, phone, paymentTerms } = req.body;
    const result = await pool.query(
      `INSERT INTO clients (freelancer_id, user_id, company_name, contact_name, email, phone, payment_terms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.userId, userId || null, companyName || null, contactName, email || null, phone || null, paymentTerms || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// Services
router.get('/services', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM freelancer_services WHERE freelancer_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get services error:', error);
    res.status(500).json({ error: 'Failed to get services' });
  }
});

router.post('/services', async (req: AuthRequest, res) => {
  try {
    const { name, description, category, pricingType, hourlyRate, fixedPrice } = req.body;
    const result = await pool.query(
      `INSERT INTO freelancer_services (freelancer_id, name, description, category, pricing_type, hourly_rate, fixed_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.userId, name, description || null, category || null, pricingType, hourlyRate ? parseFloat(hourlyRate) : null, fixedPrice ? parseFloat(fixedPrice) : null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create service error:', error);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

// Invoices
router.get('/invoices', async (req: AuthRequest, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM invoices WHERE freelancer_id = $1 ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Failed to get invoices' });
  }
});

router.post('/invoices', async (req: AuthRequest, res) => {
  try {
    const { projectId, clientId, amount, description, dueDate, status } = req.body;
    const result = await pool.query(
      `INSERT INTO invoices (freelancer_id, project_id, client_id, amount, description, due_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.userId, projectId || null, clientId || null, parseFloat(amount), description || null, dueDate || null, status || 'draft']
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

router.put('/invoices/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { amount, description, dueDate, status } = req.body;
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (amount !== undefined) {
      updates.push(`amount = $${paramCount++}`);
      values.push(parseFloat(amount));
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (dueDate !== undefined) {
      updates.push(`due_date = $${paramCount++}`);
      values.push(dueDate);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id, req.userId);
    const result = await pool.query(
      `UPDATE invoices SET ${updates.join(', ')}, updated_at = now()
       WHERE id = $${paramCount} AND freelancer_id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Update invoice error:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// Dashboard stats
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const [projects, proposals, clients, invoices] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM projects WHERE freelancer_id = $1', [req.userId]),
      pool.query("SELECT COUNT(*) as count FROM proposals WHERE freelancer_id = $1 AND status = 'pending'", [req.userId]),
      pool.query('SELECT COUNT(*) as count FROM clients WHERE freelancer_id = $1', [req.userId]),
      pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM invoices WHERE freelancer_id = $1 AND status = 'paid'", [req.userId]),
    ]);

    res.json({
      activeProjects: parseInt(projects.rows[0].count),
      pendingProposals: parseInt(proposals.rows[0].count),
      totalClients: parseInt(clients.rows[0].count),
      totalEarnings: parseFloat(invoices.rows[0].total || 0),
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;

