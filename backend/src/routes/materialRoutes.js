import express from 'express';
const router = express.Router();
import * as materialController from '../controllers/materialController.js';
import { verifyAdmin } from '../middleware/authMiddleware.js';

// All roles can view (Vendors for fulfillment, Admins for config)
router.get('/', materialController.getAllMaterials);

// But only Admins should modify
router.post('/', verifyAdmin, materialController.createMaterial);
router.put('/:id', verifyAdmin, materialController.updateMaterial);
router.delete('/:id', verifyAdmin, materialController.deleteMaterial);

export default router;
