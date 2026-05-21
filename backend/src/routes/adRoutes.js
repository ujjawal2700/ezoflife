import express from 'express';
import { createAd, getActiveAd, getAllAds, toggleAdStatus, deleteAd } from '../controllers/adController.js';
import adUpload from '../middleware/adUpload.js';
import { verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public endpoints
router.get('/active', getActiveAd);

// Admin-only endpoints
router.post('/', verifyAdmin, adUpload.single('media'), createAd);
router.get('/all', verifyAdmin, getAllAds);
router.patch('/:id/toggle', verifyAdmin, toggleAdStatus);
router.delete('/:id', verifyAdmin, deleteAd);

export default router;
