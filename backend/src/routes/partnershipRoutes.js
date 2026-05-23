import express from 'express';
import { submitPartnershipInquiry, getAllPartnershipInquiries, getPartnershipFilters } from '../controllers/partnershipController.js';
import { verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/submit', submitPartnershipInquiry);

// Admin-only route
router.get('/all', verifyAdmin, getAllPartnershipInquiries);
router.get('/filters', verifyAdmin, getPartnershipFilters);

export default router;

