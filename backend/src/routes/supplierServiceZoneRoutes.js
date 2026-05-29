import express from 'express';
import { supplierServiceZoneController } from '../controllers/supplierServiceZoneController.js';
import { verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', supplierServiceZoneController.getAll);

// Admin-only modification routes
router.post('/', verifyAdmin, supplierServiceZoneController.create);
router.post('/bulk-upload', verifyAdmin, supplierServiceZoneController.bulkUpload);
router.delete('/clear-all', verifyAdmin, supplierServiceZoneController.clearAll);
router.put('/:id', verifyAdmin, supplierServiceZoneController.update);
router.patch('/:id', verifyAdmin, supplierServiceZoneController.update);
router.delete('/:id', verifyAdmin, supplierServiceZoneController.delete);

export default router;
