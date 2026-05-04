import express from 'express';
import { 
    requestOtp, 
    verifyOtp, 
    adminLogin, 
    completeVendorProfile, 
    getStatus, 
    getUserProfile, 
    updateUserProfile, 
    updateVendorDocuments, 
    registerVendor, 
    vendorLogin, 
    becomeVendor, 
    becomeSupplier, 
    tempSeedUser,
    updateFcmToken,
    getVendorEarnings
} from '../controllers/authController.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.post('/temp-seed', tempSeedUser);
router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtp);
router.post('/update-fcm-token', updateFcmToken);
router.post('/admin-login', adminLogin);
router.post('/register-vendor', registerVendor);
router.post('/vendor-login', vendorLogin);
router.post('/complete-vendor-profile', upload.fields([
    { name: 'gstDoc', maxCount: 1 },
    { name: 'msmeDoc', maxCount: 1 }
]), completeVendorProfile);

router.get('/get-status', getStatus);
router.get('/profile/:id', getUserProfile);
router.patch('/profile/update/:id', updateUserProfile);
router.patch('/update-documents/:id', upload.single('document'), updateVendorDocuments);
router.patch('/become-vendor/:id', becomeVendor);
router.post('/become-supplier/:id', (req, res, next) => {
    upload.fields([
        { name: 'gstCert', maxCount: 1 },
        { name: 'udyogAadhar', maxCount: 1 },
        { name: 'aadharCard', maxCount: 1 },
        { name: 'addressProof', maxCount: 1 }
    ])(req, res, (err) => {
        if (err) {
            console.error('❌ [MULTER_ERROR]', err);
            return res.status(400).json({ message: 'Document upload failed', error: err.message });
        }
        next();
    });
}, becomeSupplier);

router.get('/vendor-earnings', getVendorEarnings);

export default router;
