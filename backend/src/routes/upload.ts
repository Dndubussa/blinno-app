import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { upload, uploadToSupabaseStorage } from '../middleware/upload.js';

const router = express.Router();

// Upload image file to Supabase Storage
router.post('/image', authenticate, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Determine bucket based on field name or default to 'images'
    let bucket = 'images';
    if (req.file.fieldname === 'avatar') {
      bucket = 'avatars';
    } else if (req.file.fieldname === 'portfolio' || req.file.fieldname === 'image') {
      bucket = 'portfolios';
    } else if (req.file.fieldname === 'product') {
      bucket = 'products';
    }

    // Upload to Supabase Storage
    const fileUrl = await uploadToSupabaseStorage(req.file, bucket, req.userId);

    res.json({ url: fileUrl });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

export default router;
