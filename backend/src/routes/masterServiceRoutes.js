import express from 'express';
const router = express.Router();
import { 
    createMasterService, 
    getAllMasterServices, 
    updateMasterService, 
    deleteMasterService,
    getVendorPricingReport,
    getPricingPreview
} from '../controllers/masterServiceController.js';
import { verifyAdmin } from '../middleware/authMiddleware.js';

// Public endpoints
router.get('/', getAllMasterServices);
router.get('/:serviceId/vendors', getVendorPricingReport);
router.get('/preview', getPricingPreview);

// Admin-only endpoints
router.delete('/clear-all', verifyAdmin, async (req, res) => {
    try {
        const MasterService = (await import('../models/MasterService.js')).default;
        await MasterService.deleteMany({});
        res.status(200).json({ message: 'All master services deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/', verifyAdmin, createMasterService);
router.put('/:id', verifyAdmin, updateMasterService);
router.patch('/:id', verifyAdmin, updateMasterService);
router.delete('/:id', verifyAdmin, deleteMasterService);

export default router;
