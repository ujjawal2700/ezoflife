import express from 'express';
import { 
    getAllServices, 
    createService, 
    updateService, 
    deleteService 
} from '../controllers/serviceController.js';
import { verifyAdmin, verifyAdminOrVendor } from '../middleware/authMiddleware.js';

const router = express.Router();

// Publicly available
router.get('/', getAllServices);

// Service modification routes (accessible to admins, and vendors for their custom services)
router.post('/', verifyAdminOrVendor, createService);
router.put('/:id', verifyAdminOrVendor, updateService);
router.delete('/:id', verifyAdminOrVendor, deleteService);


export default router;
