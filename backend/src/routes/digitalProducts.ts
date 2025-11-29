import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { uploadBook, uploadToSupabaseStorage, deleteFromSupabaseStorage } from '../middleware/upload.js';
import ClickPesaService, { PaymentRequest } from '../services/clickpesa.js';
import { platformFees } from '../services/platformFees.js';
import { checkProductLimit } from '../utils/subscriptionLimits.js';
import { generateWatermarkedDownloadToken, verifyWatermarkToken, addWatermarkMetadata } from '../utils/watermark.js';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { userPreferences } from '../services/userPreferences.js';

dotenv.config();

const router = express.Router();

const clickPesa = new ClickPesaService({
  clientId: process.env.CLICKPESA_CLIENT_ID || '',
  apiKey: process.env.CLICKPESA_API_KEY || '',
  baseUrl: process.env.CLICKPESA_BASE_URL || 'https://sandbox.clickpesa.com',
});

/**
 * Get my digital products (for sellers/creators)
 */
router.get('/my', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { data, error } = await supabase
      .from('digital_products')
      .select('*')
      .eq('creator_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error: any) {
    console.error('Get my digital products error:', error);
    res.status(500).json({ error: 'Failed to get digital products' });
  }
});

/**
 * Get all digital products
 */
router.get('/', async (req, res) => {
  try {
    const { creatorId, category, search } = req.query;
    
    let query = supabase
      .from('digital_products')
      .select(`
        *,
        creator:profiles!digital_products_creator_id_fkey(display_name, avatar_url)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (creatorId) {
      query = query.eq('creator_id', creatorId as string);
    }
    if (category) {
      query = query.eq('category', category as string);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Transform to match expected format
    const transformed = (data || []).map((dp: any) => ({
      ...dp,
      display_name: dp.creator?.display_name,
      avatar_url: dp.creator?.avatar_url,
    }));

    res.json(transformed);
  } catch (error: any) {
    console.error('Get digital products error:', error);
    res.status(500).json({ error: 'Failed to get digital products' });
  }
});

/**
 * Create digital product (book upload)
 */
router.post('/', authenticate, uploadBook.fields([
  { name: 'file', maxCount: 1 },        // Book file (PDF, EPUB, etc.)
  { name: 'thumbnail', maxCount: 1 },   // Book cover image
  { name: 'preview', maxCount: 1 }      // Preview file (optional)
]), async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { title, description, category, price, currency, tags } = req.body;

    if (!title || !description || !category || !price) {
      return res.status(400).json({ 
        error: 'Title, description, category, and price are required' 
      });
    }

    // Validate category
    const validCategories = ['artwork', 'photo', 'video', 'template', 'preset', 'ebook', 'music', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ 
        error: `Invalid category. Must be one of: ${validCategories.join(', ')}` 
      });
    }

    // Check subscription limits for digital products
    const limitCheck = await checkProductLimit(req.userId);
    if (!limitCheck.canCreate) {
      return res.status(403).json({ 
        error: `Product limit reached. Your plan allows up to ${limitCheck.limit} products.` 
      });
    }

    // Check if book file is uploaded
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (!files.file || !files.file[0]) {
      return res.status(400).json({ error: 'Book file is required' });
    }

    let fileUrl = null;
    let thumbnailUrl = null;
    let previewUrl = null;

    // Upload book file
    fileUrl = await uploadToSupabaseStorage(files.file[0], 'books', req.userId);

    // Upload thumbnail if provided
    if (files.thumbnail && files.thumbnail[0]) {
      thumbnailUrl = await uploadToSupabaseStorage(files.thumbnail[0], 'books', req.userId);
    }

    // Upload preview if provided
    if (files.preview && files.preview[0]) {
      previewUrl = await uploadToSupabaseStorage(files.preview[0], 'books', req.userId);
    }

    // Parse tags if provided
    let tagsArray: string[] = [];
    if (tags) {
      if (typeof tags === 'string') {
        tagsArray = tags.split(',').map(t => t.trim()).filter(t => t);
      } else if (Array.isArray(tags)) {
        tagsArray = tags;
      }
    }

    // Create digital product
    const { data, error } = await supabase
      .from('digital_products')
      .insert({
        creator_id: req.userId,
        title,
        description,
        category,
        file_url: fileUrl,
        thumbnail_url: thumbnailUrl,
        preview_url: previewUrl,
        price: parseFloat(price),
        currency: currency || 'USD',
        tags: tagsArray,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      // Clean up uploaded files if database insert fails
      if (fileUrl) await deleteFromSupabaseStorage(fileUrl, 'books');
      if (thumbnailUrl) await deleteFromSupabaseStorage(thumbnailUrl, 'books');
      if (previewUrl) await deleteFromSupabaseStorage(previewUrl, 'books');
      throw error;
    }

    res.status(201).json(data);
  } catch (error: any) {
    console.error('Create digital product error:', error);
    res.status(500).json({ error: error.message || 'Failed to create digital product' });
  }
});

/**
 * Update digital product
 */
router.put('/:id', authenticate, uploadBook.fields([
  { name: 'file', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
  { name: 'preview', maxCount: 1 }
]), async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const { title, description, category, price, currency, tags, isActive } = req.body;

    // Check ownership
    const { data: existing, error: checkError } = await supabase
      .from('digital_products')
      .select('creator_id, file_url, thumbnail_url, preview_url')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ error: 'Digital product not found' });
    }

    if (existing.creator_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) {
      const validCategories = ['artwork', 'photo', 'video', 'template', 'preset', 'ebook', 'music', 'other'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ 
          error: `Invalid category. Must be one of: ${validCategories.join(', ')}` 
        });
      }
      updates.category = category;
    }
    if (price !== undefined) updates.price = parseFloat(price);
    if (currency !== undefined) updates.currency = currency;
    if (tags !== undefined) {
      if (typeof tags === 'string') {
        updates.tags = tags.split(',').map((t: string) => t.trim()).filter((t: string) => t);
      } else if (Array.isArray(tags)) {
        updates.tags = tags;
      }
    }
    if (isActive !== undefined) updates.is_active = isActive === 'true' || isActive === true;

    // Handle file uploads
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (files.file && files.file[0]) {
      // Delete old file
      if (existing.file_url) {
        await deleteFromSupabaseStorage(existing.file_url, 'books');
      }
      // Upload new file
      updates.file_url = await uploadToSupabaseStorage(files.file[0], 'books', req.userId);
    }

    if (files.thumbnail && files.thumbnail[0]) {
      // Delete old thumbnail
      if (existing.thumbnail_url) {
        await deleteFromSupabaseStorage(existing.thumbnail_url, 'books');
      }
      // Upload new thumbnail
      updates.thumbnail_url = await uploadToSupabaseStorage(files.thumbnail[0], 'books', req.userId);
    }

    if (files.preview && files.preview[0]) {
      // Delete old preview
      if (existing.preview_url) {
        await deleteFromSupabaseStorage(existing.preview_url, 'books');
      }
      // Upload new preview
      updates.preview_url = await uploadToSupabaseStorage(files.preview[0], 'books', req.userId);
    }

    // Update digital product
    const { data, error } = await supabase
      .from('digital_products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error: any) {
    console.error('Update digital product error:', error);
    res.status(500).json({ error: error.message || 'Failed to update digital product' });
  }
});

/**
 * Delete digital product
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;

    // Check ownership
    const { data: existing, error: checkError } = await supabase
      .from('digital_products')
      .select('creator_id, file_url, thumbnail_url, preview_url')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ error: 'Digital product not found' });
    }

    if (existing.creator_id !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Delete files from storage
    if (existing.file_url) {
      await deleteFromSupabaseStorage(existing.file_url, 'books');
    }
    if (existing.thumbnail_url) {
      await deleteFromSupabaseStorage(existing.thumbnail_url, 'books');
    }
    if (existing.preview_url) {
      await deleteFromSupabaseStorage(existing.preview_url, 'books');
    }

    // Delete from database
    const { error } = await supabase
      .from('digital_products')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.json({ message: 'Digital product deleted successfully' });
  } catch (error: any) {
    console.error('Delete digital product error:', error);
    res.status(500).json({ error: 'Failed to delete digital product' });
  }
});

/**
 * Get digital product by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: product, error } = await supabase
      .from('digital_products')
      .select(`
        *,
        creator:profiles!digital_products_creator_id_fkey(display_name, avatar_url)
      `)
      .eq('id', id)
      .single();

    if (error || !product) {
      return res.status(404).json({ error: 'Digital product not found' });
    }

    const transformed = {
      ...product,
      display_name: product.creator?.display_name,
      avatar_url: product.creator?.avatar_url,
    };

    res.json(transformed);
  } catch (error: any) {
    console.error('Get digital product error:', error);
    res.status(500).json({ error: 'Failed to get digital product' });
  }
});

/**
 * Purchase digital product
 */
router.post('/:id/purchase', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { customerPhone, customerEmail, customerName } = req.body;

    if (!customerPhone) {
      return res.status(400).json({ error: 'Customer phone number is required' });
    }

    // Check if user is authenticated
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's preferred currency
    const userPrefs = await userPreferences.getUserPreferences(req.userId);
    const currency = userPrefs.currency || 'USD';

    // Get digital product
    const { data: product, error: productError } = await supabase
      .from('digital_products')
      .select(`
        *,
        creator:profiles!digital_products_creator_id_fkey(display_name)
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: 'Digital product not found' });
    }

    // Get creator email
    const { data: authUser } = await supabase.auth.admin.getUserById(product.creator_id);

    // Check if already purchased
    const { data: existingPurchase } = await supabase
      .from('digital_product_purchases')
      .select('*')
      .eq('product_id', id)
      .eq('buyer_id', req.userId)
      .eq('payment_status', 'paid')
      .single();

    if (existingPurchase) {
      return res.status(400).json({ error: 'You have already purchased this product' });
    }

    // Calculate fees with user's currency
    const feeCalculation = platformFees.calculateDigitalProductFee(parseFloat(product.price), undefined, undefined, currency);

    // Create purchase record (pending payment) with user's currency
    const { data: purchase, error: purchaseError } = await supabase
      .from('digital_product_purchases')
      .upsert({
        product_id: id,
        buyer_id: req.userId,
        amount_paid: feeCalculation.total,
        currency: currency,
        payment_status: 'pending',
      }, { onConflict: 'product_id,buyer_id' })
      .select()
      .single();

    if (purchaseError || !purchase) {
      throw purchaseError;
    }

    // Create payment record with user's currency
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: `digital_product_${id}_${req.userId}`,
        user_id: req.userId,
        amount: feeCalculation.total,
        currency: currency,
        status: 'pending',
        payment_method: 'clickpesa',
        payment_type: 'digital_product',
      })
      .select()
      .single();

    if (paymentError || !payment) {
      throw paymentError;
    }

    // Record platform fee
    await supabase
      .from('platform_fees')
      .insert({
        transaction_id: `digital_product_${id}_${req.userId}`,
        transaction_type: 'digital_product',
        user_id: product.creator_id,
        buyer_id: req.userId,
        subtotal: feeCalculation.subtotal,
        platform_fee: feeCalculation.platformFee,
        payment_processing_fee: feeCalculation.paymentProcessingFee,
        total_fees: feeCalculation.totalFees,
        creator_payout: feeCalculation.creatorPayout,
        status: 'pending',
      });

    // Create Click Pesa payment request with user's currency
    const paymentRequest: PaymentRequest = {
      amount: feeCalculation.total,
      currency: currency,
      orderId: `digital_product_${id}_${req.userId}`,
      customerPhone: customerPhone,
      customerEmail: customerEmail || authUser?.user?.email || '',
      customerName: customerName || product.creator?.display_name || 'Customer',
      description: `Purchase: ${product.title}`,
      callbackUrl: `${process.env.APP_URL || 'https://www.blinno.app'}/api/payments/webhook`,
    };

    const clickPesaResponse = await clickPesa.createPayment(paymentRequest);

    if (!clickPesaResponse.success) {
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          error_message: clickPesaResponse.error || 'Payment creation failed',
        })
        .eq('id', payment.id);

      return res.status(400).json({
        error: clickPesaResponse.error || 'Failed to create payment',
      });
    }

    // Update payment with Click Pesa details
    await supabase
      .from('payments')
      .update({
        payment_id: clickPesaResponse.paymentId,
        transaction_id: clickPesaResponse.transactionId,
        checkout_url: clickPesaResponse.checkoutUrl,
        status: 'initiated',
      })
      .eq('id', payment.id);

    res.json({
      success: true,
      paymentId: payment.id,
      checkoutUrl: clickPesaResponse.checkoutUrl,
      message: 'Payment initiated successfully',
    });
  } catch (error: any) {
    console.error('Purchase digital product error:', error);
    res.status(500).json({ error: 'Failed to purchase digital product' });
  }
});

/**
 * Download purchased digital product
 */
router.get('/:id/download', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const { token } = req.query;

    // Get digital product
    const { data: product, error: productError } = await supabase
      .from('digital_products')
      .select('*')
      .eq('id', id)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: 'Digital product not found' });
    }

    // Check if user owns the product (creator) or has purchased it
    const isCreator = product.creator_id === req.userId;
    
    if (!isCreator) {
      // Check if user has purchased the product
      const { data: purchase } = await supabase
        .from('digital_product_purchases')
        .select('*')
        .eq('product_id', id)
        .eq('buyer_id', req.userId)
        .eq('payment_status', 'paid')
        .single();

      if (!purchase) {
        return res.status(403).json({ error: 'You must purchase this product to download it' });
      }
    }

    // Get buyer information for watermarking
    let buyerEmail = '';
    let purchaseDate = '';
    
    if (!isCreator) {
      const { data: purchase } = await supabase
        .from('digital_product_purchases')
        .select('*, buyer:users!digital_product_purchases_buyer_id_fkey(email)')
        .eq('product_id', id)
        .eq('buyer_id', req.userId)
        .eq('payment_status', 'paid')
        .single();

      if (purchase) {
        buyerEmail = (purchase.buyer as any)?.email || req.userId;
        purchaseDate = purchase.created_at || new Date().toISOString();
      }
    }

    // Generate watermarked download token
    const downloadToken = generateWatermarkedDownloadToken(
      id,
      req.userId!,
      buyerEmail || req.userId!
    );

    // Increment download count
    await supabase
      .from('digital_products')
      .update({ download_count: (product.download_count || 0) + 1 })
      .eq('id', id);

    // Add watermark metadata to response headers
    const watermarkHeaders = addWatermarkMetadata(
      product.title,
      buyerEmail || req.userId!,
      purchaseDate || new Date().toISOString()
    );

    // Set watermark headers
    Object.entries(watermarkHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Return download URL with watermark token
    const downloadUrl = new URL(product.file_url);
    downloadUrl.searchParams.set('token', downloadToken);
    downloadUrl.searchParams.set('watermark', 'true');

    res.json({
      downloadUrl: downloadUrl.toString(),
      title: product.title,
      fileName: `${product.title.replace(/[^a-z0-9]/gi, '_')}.${product.file_url.split('.').pop()}`,
      watermarkToken: downloadToken,
      watermarkInfo: buyerEmail ? `Purchased by ${buyerEmail}` : undefined,
    });
  } catch (error: any) {
    console.error('Download digital product error:', error);
    res.status(500).json({ error: 'Failed to get download link' });
  }
});

/**
 * Get purchased digital products for user
 */
router.get('/my/purchases', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('digital_product_purchases')
      .select(`
        *,
        products:digital_products!inner(title, description, file_url, preview_url, category, thumbnail_url)
      `)
      .eq('buyer_id', req.userId)
      .eq('payment_status', 'paid')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform to match expected format
    const transformed = (data || []).map((dpp: any) => ({
      ...dpp,
      title: dpp.products?.title,
      description: dpp.products?.description,
      file_url: dpp.products?.file_url,
      preview_url: dpp.products?.preview_url,
      thumbnail_url: dpp.products?.thumbnail_url,
      category: dpp.products?.category,
    }));

    res.json(transformed);
  } catch (error: any) {
    console.error('Get my purchases error:', error);
    res.status(500).json({ error: 'Failed to get purchases' });
  }
});

export default router;
