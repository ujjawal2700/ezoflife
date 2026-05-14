import express from 'express';
import { categoryController } from '../controllers/categoryController.js';

const router = express.Router();

router.post('/', categoryController.create);
router.get('/', categoryController.getAll);
router.post('/bulk-upload', categoryController.bulkUpload);
router.delete('/clear-all', categoryController.clearAll);
router.put('/:id', categoryController.update);
router.patch('/:id', categoryController.update); // Support patch for multipliers
router.delete('/:id', categoryController.delete);

export default router;
