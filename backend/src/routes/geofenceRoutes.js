import express from 'express';
import { 
    createServiceArea, 
    getAllServiceAreas, 
    updateServiceArea, 
    deleteServiceArea, 
    checkLocationAvailability,
    getPincodeMappings
} from '../controllers/geofenceController.js';
import { verifyAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Admin Routes (JWT verification required)
router.post('/areas', verifyAdmin, createServiceArea);
router.get('/areas', verifyAdmin, getAllServiceAreas);
router.patch('/areas/:id', verifyAdmin, updateServiceArea);
router.delete('/areas/:id', verifyAdmin, deleteServiceArea);
router.get('/pincode-mappings', verifyAdmin, getPincodeMappings);

// Public/Customer Routes
router.get('/check-availability', checkLocationAvailability);
router.get('/public/areas', getAllServiceAreas);

export default router;
