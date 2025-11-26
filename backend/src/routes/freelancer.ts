import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and freelancer role
router.use(authenticate);
router.use(requireRole('freelancer'));

// Projects
router.get('/projects', async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('freelancer_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error: any) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to get projects' });
  }
});

router.post('/projects', async (req: AuthRequest, res) => {
  try {
    const { title, description, billingType, budget, status, startDate, endDate } = req.body;
    
    const { data, error } = await supabase
      .from('projects')
      .insert({
        freelancer_id: req.userId,
        title,
        description,
        billing_type: billingType,
        budget: budget ? parseFloat(budget) : null,
        status: status || 'draft',
        start_date: startDate || null,
        end_date: endDate || null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

router.put('/projects/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    ['title', 'description', 'billing_type', 'budget', 'status', 'start_date', 'end_date'].forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .eq('freelancer_id', req.userId)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(data);
  } catch (error: any) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

router.delete('/projects/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('freelancer_id', req.userId);

    if (error) {
      throw error;
    }

    res.json({ message: 'Project deleted' });
  } catch (error: any) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Proposals
router.get('/proposals', async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('freelancer_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data || []);
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
      const { data: project } = await supabase
        .from('projects')
        .select('client_id')
        .eq('id', projectId)
        .single();

      if (project?.client_id) {
        const { data: client } = await supabase
          .from('clients')
          .select('user_id')
          .eq('id', project.client_id)
          .single();

        if (client?.user_id) {
          // Auto-create client if needed
          const createdClientId = await ensureClientExists({
            freelancerId: req.userId,
            userId: client.user_id,
          });
          if (createdClientId) {
            finalClientId = createdClientId;
          } else {
            finalClientId = project.client_id;
          }
        } else {
          finalClientId = project.client_id;
        }
      }
    }

    // If proposal is being accepted, ensure client exists
    if (status === 'accepted' && finalClientId) {
      const { data: client } = await supabase
        .from('clients')
        .select('user_id')
        .eq('id', finalClientId)
        .single();

      if (client?.user_id) {
        await ensureClientExists({
          freelancerId: req.userId,
          userId: client.user_id,
        });
      }
    }

    const { data, error } = await supabase
      .from('proposals')
      .insert({
        project_id: projectId || null,
        freelancer_id: req.userId,
        client_id: finalClientId || null,
        message,
        proposed_rate: proposedRate ? parseFloat(proposedRate) : null,
        status: status || 'pending',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create proposal error:', error);
    res.status(500).json({ error: 'Failed to create proposal' });
  }
});

// Clients
router.get('/clients', async (req: AuthRequest, res) => {
  try {
    const { data: clients, error } = await supabase
      .from('clients')
      .select(`
        *,
        profiles!clients_user_id_fkey(display_name, avatar_url),
        users!clients_user_id_fkey(email)
      `)
      .eq('freelancer_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Get project and invoice counts
    const enrichedClients = await Promise.all((clients || []).map(async (client: any) => {
      const [projectsCount, invoicesCount] = await Promise.all([
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('client_id', client.id),
        supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('client_id', client.id),
      ]);

      return {
        ...client,
        display_name: client.profiles?.display_name,
        avatar_url: client.profiles?.avatar_url,
        user_email: client.users?.email,
        project_count: projectsCount.count || 0,
        invoice_count: invoicesCount.count || 0,
      };
    }));

    res.json(enrichedClients);
  } catch (error: any) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Failed to get clients' });
  }
});

router.post('/clients', async (req: AuthRequest, res) => {
  try {
    const { userId, companyName, contactName, email, phone, paymentTerms } = req.body;
    
    const { data, error } = await supabase
      .from('clients')
      .insert({
        freelancer_id: req.userId,
        user_id: userId || null,
        company_name: companyName || null,
        contact_name: contactName,
        email: email || null,
        phone: phone || null,
        payment_terms: paymentTerms || null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// Services
router.get('/services', async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('freelancer_services')
      .select('*')
      .eq('freelancer_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error: any) {
    console.error('Get services error:', error);
    res.status(500).json({ error: 'Failed to get services' });
  }
});

router.post('/services', async (req: AuthRequest, res) => {
  try {
    const { name, description, category, pricingType, hourlyRate, fixedPrice } = req.body;
    
    const { data, error } = await supabase
      .from('freelancer_services')
      .insert({
        freelancer_id: req.userId,
        name,
        description: description || null,
        category: category || null,
        pricing_type: pricingType,
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
        fixed_price: fixedPrice ? parseFloat(fixedPrice) : null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create service error:', error);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

// Invoices
router.get('/invoices', async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('freelancer_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error: any) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Failed to get invoices' });
  }
});

router.post('/invoices', async (req: AuthRequest, res) => {
  try {
    const { projectId, clientId, amount, description, dueDate, status } = req.body;
    
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        freelancer_id: req.userId,
        project_id: projectId || null,
        client_id: clientId || null,
        amount: parseFloat(amount),
        description: description || null,
        due_date: dueDate || null,
        status: status || 'draft',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

router.put('/invoices/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { amount, description, dueDate, status } = req.body;

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (amount !== undefined) updates.amount = parseFloat(amount);
    if (description !== undefined) updates.description = description;
    if (dueDate !== undefined) updates.due_date = dueDate;
    if (status !== undefined) updates.status = status;

    const { data, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .eq('freelancer_id', req.userId)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(data);
  } catch (error: any) {
    console.error('Update invoice error:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// Dashboard stats
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const [projects, proposals, clients, invoices] = await Promise.all([
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('freelancer_id', req.userId),
      supabase.from('proposals').select('*', { count: 'exact', head: true }).eq('freelancer_id', req.userId).eq('status', 'pending'),
      supabase.from('clients').select('*', { count: 'exact', head: true }).eq('freelancer_id', req.userId),
      supabase.from('invoices').select('amount').eq('freelancer_id', req.userId).eq('status', 'paid'),
    ]);

    let totalEarnings = 0;
    if (invoices.data) {
      totalEarnings = invoices.data.reduce((sum: number, inv: any) => sum + (parseFloat(inv.amount) || 0), 0);
    }

    res.json({
      activeProjects: projects.count || 0,
      pendingProposals: proposals.count || 0,
      totalClients: clients.count || 0,
      totalEarnings,
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;
