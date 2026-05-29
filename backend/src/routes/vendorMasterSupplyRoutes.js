import express from 'express';
import { vendorMasterSupplyController } from '../controllers/vendorMasterSupplyController.js';
import { verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', vendorMasterSupplyController.getAll);
router.get('/live-catalog', vendorMasterSupplyController.getLiveCatalog);

// Admin-only modification routes
router.post('/', verifyAdmin, vendorMasterSupplyController.create);
router.post('/bulk-upload', verifyAdmin, vendorMasterSupplyController.bulkUpload);
router.delete('/clear-all', verifyAdmin, vendorMasterSupplyController.clearAll);
router.put('/:id', verifyAdmin, vendorMasterSupplyController.update);
router.patch('/:id', verifyAdmin, vendorMasterSupplyController.update);
router.delete('/:id', verifyAdmin, vendorMasterSupplyController.delete);

export default router;
