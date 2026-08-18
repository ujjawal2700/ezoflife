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
import { verifyAdmin, verifyUser } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/verify-gst', verifyUser, verifyGst);
router.post('/initiate-bank-verify', verifyUser, initiateBankVerification);
router.post('/complete-bank-verify', verifyUser, completeBankVerification);
router.post('/apply/:userId', verifyUser, submitApplication);
router.get('/my-status/:userId', (req, res) => {
    // We will define this in controller or inline here for speed
    import('../models/SupplierApplication.js').then(m => {
        const SupplierApplication = m.default;
        SupplierApplication.findOne({ user: req.params.userId })
            .then(app => res.status(200).json(app))
            .catch(err => res.status(500).json({ message: err.message }));
    });
});

// Admin-only endpoints
router.get('/requests', verifyAdmin, getAllApplications);
router.get('/requests/:id', verifyAdmin, getApplicationById);

// Two-Stage Approval Workflow
router.patch('/requests/:id/approve-initial', verifyAdmin, initialApproveApplication);
router.post('/select-products', verifyUser, selectProducts);
router.patch('/requests/:id/approve-final', verifyAdmin, finalApproveApplication);

router.patch('/requests/:id/reject', verifyAdmin, rejectApplication);

export default router;
