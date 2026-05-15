import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const isVideo = file.mimetype.startsWith('video/');
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    
    // Sanitize filename: replace spaces/special chars with hyphens
    const cleanName = file.originalname
      .split('.')[0]
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-');

    return {
      folder: 'ezoflife/documents',
      // For PDFs, use 'raw' to avoid them being treated as images/thumbnails
      resource_type: isPdf ? 'raw' : (isVideo ? 'video' : 'image'),
      // IMPORTANT: Don't set allowed_formats for 'raw' files
      allowed_formats: isPdf ? undefined : ['jpg', 'png', 'jpeg', 'mp4', 'mov', 'avi'],
      // For raw files, the extension MUST be part of the public_id to be served correctly
      public_id: `${Date.now()}-${cleanName}${isPdf ? '.pdf' : ''}`,
    };
  },
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit for videos
});

export default upload;
