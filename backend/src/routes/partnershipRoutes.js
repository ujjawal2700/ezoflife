import express from 'express';
import { submitPartnershipInquiry, getAllPartnershipInquiries, getPartnershipFilters, deletePartnershipInquiry, updatePartnershipStatus, getMyPartnershipInquiries } from '../controllers/partnershipController.js';
import { verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/submit', submitPartnershipInquiry);
router.get('/my-inquiries', getMyPartnershipInquiries);

// Admin-only routes
router.get('/all', verifyAdmin, getAllPartnershipInquiries);
router.get('/filters', verifyAdmin, getPartnershipFilters);
router.delete('/:id', verifyAdmin, deletePartnershipInquiry);
router.put('/:id/status', verifyAdmin, updatePartnershipStatus);

export default router;

