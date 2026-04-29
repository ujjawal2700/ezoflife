import express from 'express';
import { 
    submitApplication, 
    getAllApplications, 
    getApplicationById, 
    approveApplication, 
    rejectApplication 
} from '../controllers/supplierController.js';

const router = express.Router();

router.post('/apply/:userId', submitApplication);
router.get('/requests', getAllApplications);
router.get('/requests/:id', getApplicationById);
router.patch('/requests/:id/approve', approveApplication);
router.patch('/requests/:id/reject', rejectApplication);

export default router;
