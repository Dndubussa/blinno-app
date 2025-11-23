import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

const uploadDir = process.env.UPLOAD_DIR || './uploads';

// Create upload directories if they don't exist
const dirs = [
  uploadDir,
  path.join(uploadDir, 'avatars'),
  path.join(uploadDir, 'portfolios'),
  path.join(uploadDir, 'products'),
  path.join(uploadDir, 'images'),
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    let folder = 'images';
    
    if (file.fieldname === 'avatar') {
      folder = 'avatars';
    } else if (file.fieldname === 'portfolio' || file.fieldname === 'image') {
      folder = 'portfolios';
    } else if (file.fieldname === 'product') {
      folder = 'products';
    }
    
    cb(null, path.join(uploadDir, folder));
  },
  filename: (req: Request, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

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

export const getFileUrl = (filePath: string): string => {
  const relativePath = filePath.replace(uploadDir, '').replace(/\\/g, '/');
  return `/api/uploads${relativePath}`;
};

