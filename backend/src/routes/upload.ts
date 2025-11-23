import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { upload, getFileUrl } from '../middleware/upload.js';

const router = express.Router();

// Upload image file
router.post('/image', authenticate, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = getFileUrl(req.file.path);
    res.json({ url: fileUrl });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

export default router;

