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

router.delete('/clear-all', async (req, res) => {
    try {
        const MasterService = (await import('../models/MasterService.js')).default;
        await MasterService.deleteMany({});
        res.status(200).json({ message: 'All master services deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/', createMasterService);
router.get('/', getAllMasterServices);
router.get('/:serviceId/vendors', getVendorPricingReport);
router.get('/preview', getPricingPreview);
router.put('/:id', updateMasterService);
router.delete('/:id', deleteMasterService);

export default router;
