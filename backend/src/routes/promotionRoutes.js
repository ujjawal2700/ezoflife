import express from 'express';
import { 
    createPromotion, 
    getVendorPromotions, 
    togglePromotionStatus, 
    deletePromotion,
    getApplicablePromos,
    validatePromotion,
    getAllPromotions,
    approvePromotion,
    rejectPromotion
} from '../controllers/promotionController.js';

const router = express.Router();

router.post('/', createPromotion);
router.post('/validate', validatePromotion);
router.get('/vendor', getVendorPromotions);
router.get('/applicable', getApplicablePromos);
router.patch('/:id/toggle', togglePromotionStatus);
router.delete('/:id', deletePromotion);

// Admin endpoints
router.get('/admin/list', getAllPromotions);
router.patch('/admin/:id/approve', approvePromotion);
router.patch('/admin/:id/reject', rejectPromotion);

export default router;
