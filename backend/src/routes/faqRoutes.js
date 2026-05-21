import express from 'express';
const router = express.Router();
import { 
    getAllFAQs, 
    createFAQ, 
    updateFAQ, 
    deleteFAQ,
    reorderFAQs
} from '../controllers/faqController.js';
import { verifyAdmin } from '../middleware/authMiddleware.js';

router.get('/', getAllFAQs);

// Admin-only modification routes
router.post('/reorder', verifyAdmin, reorderFAQs);
router.post('/', verifyAdmin, createFAQ);
router.patch('/:id', verifyAdmin, updateFAQ);
router.delete('/:id', verifyAdmin, deleteFAQ);

export default router;
