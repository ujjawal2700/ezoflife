import express from 'express';
import { masterPricingController } from '../controllers/masterPricingController.js';

const router = express.Router();

router.get('/', masterPricingController.getAll);
router.post('/sync', masterPricingController.sync);
router.patch('/:id', masterPricingController.update);

export default router;
