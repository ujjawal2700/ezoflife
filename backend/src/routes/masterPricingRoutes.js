import express from 'express';
import { masterPricingController } from '../controllers/masterPricingController.js';
import { verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public / Customer read access (for onboarding catalog rates)
router.get('/', masterPricingController.getAll);

// Admin-only write access
router.post('/sync', verifyAdmin, masterPricingController.sync);
router.patch('/:id', verifyAdmin, masterPricingController.update);

export default router;
