import express from 'express';
import { categoryController } from '../controllers/categoryController.js';
import { verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', categoryController.getAll);

// Admin-only modification routes
router.post('/', verifyAdmin, categoryController.create);
router.post('/bulk-upload', verifyAdmin, categoryController.bulkUpload);
router.delete('/clear-all', verifyAdmin, categoryController.clearAll);
router.put('/:id', verifyAdmin, categoryController.update);
router.patch('/:id', verifyAdmin, categoryController.update);
router.delete('/:id', verifyAdmin, categoryController.delete);

export default router;
