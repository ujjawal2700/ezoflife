import express from 'express';
const router = express.Router();
import { 
    submitFeedback,
    getVendorFeedbacks,
    getAllFeedbacks, 
    deleteFeedback 
} from '../controllers/feedbackController.js';
import { verifyAdmin } from '../middleware/authMiddleware.js';

router.post('/submit', submitFeedback);
router.get('/vendor/:vendorId', getVendorFeedbacks);

// Admin-only routes
router.get('/all', verifyAdmin, getAllFeedbacks);
router.delete('/:id', verifyAdmin, deleteFeedback);

export default router;
