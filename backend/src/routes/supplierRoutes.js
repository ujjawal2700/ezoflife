import express from 'express';
import { 
    submitApplication,
    getAllApplications,
    getApplicationById,
    initialApproveApplication,
    finalApproveApplication,
    selectProducts,
    rejectApplication,
    verifyGst,
    initiateBankVerification,
    completeBankVerification
} from '../controllers/supplierController.js';

const router = express.Router();

router.post('/verify-gst', verifyGst);
router.post('/initiate-bank-verify', initiateBankVerification);
router.post('/complete-bank-verify', completeBankVerification);
router.post('/apply/:userId', submitApplication);
router.get('/my-status/:userId', (req, res) => {
    // We will define this in controller or inline here for speed
    import('../models/SupplierApplication.js').then(m => {
        const SupplierApplication = m.default;
        SupplierApplication.findOne({ user: req.params.userId })
            .then(app => res.status(200).json(app))
            .catch(err => res.status(500).json({ message: err.message }));
    });
});

router.get('/requests', getAllApplications);
router.get('/requests/:id', getApplicationById);

// Two-Stage Approval Workflow
router.patch('/requests/:id/approve-initial', initialApproveApplication);
router.post('/select-products', selectProducts);
router.patch('/requests/:id/approve-final', finalApproveApplication);

router.patch('/requests/:id/reject', rejectApplication);

export default router;
