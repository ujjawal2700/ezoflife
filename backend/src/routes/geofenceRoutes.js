import express from 'express';
import { 
    createServiceArea, 
    getAllServiceAreas, 
    updateServiceArea, 
    deleteServiceArea, 
    checkLocationAvailability 
} from '../controllers/geofenceController.js';

const router = express.Router();

// Admin Routes
router.post('/areas', createServiceArea);
router.get('/areas', getAllServiceAreas);
router.patch('/areas/:id', updateServiceArea);
router.delete('/areas/:id', deleteServiceArea);

// Public/Customer Routes
router.get('/check-availability', checkLocationAvailability);

export default router;
