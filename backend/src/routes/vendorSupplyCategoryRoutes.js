import express from 'express';
import { vendorSupplyCategoryController } from '../controllers/vendorSupplyCategoryController.js';
import { verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', vendorSupplyCategoryController.getAll);

// Admin-only modification routes
router.post('/', verifyAdmin, vendorSupplyCategoryController.create);
router.post('/bulk-upload', verifyAdmin, vendorSupplyCategoryController.bulkUpload);
router.delete('/clear-all', verifyAdmin, vendorSupplyCategoryController.clearAll);
router.put('/:id', verifyAdmin, vendorSupplyCategoryController.update);
router.patch('/:id', verifyAdmin, vendorSupplyCategoryController.update);
router.delete('/:id', verifyAdmin, vendorSupplyCategoryController.delete);

export default router;
