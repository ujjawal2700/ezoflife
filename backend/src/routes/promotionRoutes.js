import express from 'express';
import { 
    createPromotion, 
    getVendorPromotions, 
    togglePromotionStatus, 
    deletePromotion,
    getApplicablePromos,
    validatePromotion
} from '../controllers/promotionController.js';

const router = express.Router();

router.post('/', createPromotion);
router.post('/validate', validatePromotion);
router.get('/vendor', getVendorPromotions);
router.get('/applicable', getApplicablePromos);
router.patch('/:id/toggle', togglePromotionStatus);
router.delete('/:id', deletePromotion);

export default router;
