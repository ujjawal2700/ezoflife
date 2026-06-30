import express from 'express';
import { submitPartnershipInquiry, getAllPartnershipInquiries, getPartnershipFilters, deletePartnershipInquiry } from '../controllers/partnershipController.js';
import { verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/submit', submitPartnershipInquiry);

// Admin-only routes
router.get('/all', verifyAdmin, getAllPartnershipInquiries);
router.get('/filters', verifyAdmin, getPartnershipFilters);
router.delete('/:id', verifyAdmin, deletePartnershipInquiry);

export default router;

