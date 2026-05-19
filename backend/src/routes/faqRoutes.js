import express from 'express';
const router = express.Router();
import { 
    getAllFAQs, 
    createFAQ, 
    updateFAQ, 
    deleteFAQ,
    reorderFAQs
} from '../controllers/FAQController.js';

router.get('/', getAllFAQs);
router.post('/reorder', reorderFAQs);
router.post('/', createFAQ);
router.patch('/:id', updateFAQ);
router.delete('/:id', deleteFAQ);

export default router;
