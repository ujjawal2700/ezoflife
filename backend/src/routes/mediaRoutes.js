import express from 'express';
import upload from '../middleware/upload.js';
import { uploadMedia, uploadMultipleMedia, getMediaHistory, getLatestMedia, submitInquiry, getAllInquiries } from '../controllers/mediaController.js';

const router = express.Router();

router.post('/upload', upload.single('media'), uploadMedia);
router.post('/bulk-upload', upload.array('photos', 5), uploadMultipleMedia);
router.get('/history', getMediaHistory);
router.get('/latest', getLatestMedia);

// Ad Inquiries
router.post('/inquiry', submitInquiry);
router.get('/inquiries', getAllInquiries);

export default router;
