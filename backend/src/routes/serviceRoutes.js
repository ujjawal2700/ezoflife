import express from 'express';
import { 
    getAllServices, 
    createService, 
    updateService, 
    deleteService 
} from '../controllers/serviceController.js';
import { verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Publicly available
router.get('/', getAllServices);

// Admin-only modification routes
router.post('/', verifyAdmin, createService);
router.put('/:id', verifyAdmin, updateService);
router.delete('/:id', verifyAdmin, deleteService);

export default router;
