import express from 'express';
import { submitPartnershipInquiry, getAllPartnershipInquiries } from '../controllers/partnershipController.js';
import { verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/submit', submitPartnershipInquiry);

// Admin-only route
router.get('/all', verifyAdmin, getAllPartnershipInquiries);

export default router;
