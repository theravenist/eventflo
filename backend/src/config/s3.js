import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure the local uploads folder exists for local mock storage
const uploadDir = 'public/uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Setup Multer memory storage (allows uploading to S3 or local disk later)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to restrict uploads to images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  
  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed!'));
};

export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

/**
 * Upload banner image.
 * If S3_MOCK is true or AWS credentials are missing, we return a local path.
 * Otherwise, this would integrate with `@aws-sdk/client-s3` to upload.
 */
export const uploadToStorage = async (file) => {
  if (!file) return null;
  
  const isMock = process.env.S3_MOCK !== 'false';
  
  if (isMock) {
    // Return relative URL for static Express serving
    return `/uploads/${file.filename}`;
  }
  
  // Real S3 upload placeholder logic:
  // import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
  // const s3 = new S3Client({ region: process.env.AWS_REGION });
  // ... upload to S3 bucket ...
  // return `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${file.filename}`;
  
  console.log('Real S3 selected but not configured. Falling back to local storage.');
  return `/uploads/${file.filename}`;
};
