import multer from 'multer';
import { Request } from 'express';
import { supabaseAdmin } from '../config/supabase.js';

// In-memory storage for multer (we'll upload directly to Supabase Storage)
const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp,image/gif').split(',');
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images are allowed.'));
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
  },
  fileFilter,
});

/**
 * Upload file to Supabase Storage
 * @param file - Multer file object
 * @param bucket - Storage bucket name (e.g., 'avatars', 'portfolios', 'products', 'images')
 * @param userId - User ID for organizing files
 * @returns Public URL of the uploaded file
 */
export const uploadToSupabaseStorage = async (
  file: Express.Multer.File,
  bucket: string,
  userId?: string
): Promise<string> => {
  try {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = file.originalname.split('.').pop() || '';
    const filename = userId 
      ? `${userId}/${uniqueSuffix}.${ext}`
      : `${uniqueSuffix}.${ext}`;

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload file to Supabase Storage: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error: any) {
    console.error('Supabase Storage upload error:', error);
    throw error;
  }
};

/**
 * Delete file from Supabase Storage
 * @param fileUrl - Public URL of the file
 * @param bucket - Storage bucket name
 */
export const deleteFromSupabaseStorage = async (
  fileUrl: string,
  bucket: string
): Promise<void> => {
  try {
    // Extract file path from URL
    const urlParts = fileUrl.split('/');
    const filePath = urlParts.slice(-2).join('/'); // Get last two parts (userId/filename)

    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('Failed to delete file from Supabase Storage:', error);
      // Don't throw - file might not exist or already deleted
    }
  } catch (error: any) {
    console.error('Supabase Storage delete error:', error);
    // Don't throw - deletion is not critical
  }
};

/**
 * Get file URL (for backward compatibility)
 * Now returns Supabase Storage URL directly
 */
export const getFileUrl = (filePath: string): string => {
  // If it's already a full URL, return it
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  
  // For backward compatibility with old local file paths
  // In production, all files should be in Supabase Storage
  const relativePath = filePath.replace(/^.*[\\\/]/, '');
  return `/api/uploads/${relativePath}`;
};

/**
 * Initialize Supabase Storage buckets
 * Call this on server startup to ensure buckets exist
 */
export const initializeStorageBuckets = async (): Promise<void> => {
  const buckets = ['avatars', 'portfolios', 'products', 'images'];
  
  for (const bucket of buckets) {
    try {
      // Check if bucket exists
      const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
      
      if (listError) {
        console.error(`Error listing buckets: ${listError.message}`);
        continue;
      }

      const bucketExists = buckets?.some(b => b.name === bucket);
      
      if (!bucketExists) {
        // Create bucket if it doesn't exist
        const { error: createError } = await supabaseAdmin.storage.createBucket(bucket, {
          public: true, // Make bucket public for easy access
          fileSizeLimit: 10485760, // 10MB
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        });

        if (createError) {
          console.error(`Error creating bucket ${bucket}: ${createError.message}`);
        } else {
          console.log(`Created Supabase Storage bucket: ${bucket}`);
        }
      }
    } catch (error: any) {
      console.error(`Error initializing bucket ${bucket}:`, error);
    }
  }
};
