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
    getVendorEarnings,
    submitVendorServices,
    updateProfileImage,
    getDraftCart,
    updateDraftCart
} from '../controllers/authController.js';
import { getVendorPayoutHistory } from '../controllers/adminController.js';
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
router.patch('/update-profile-image/:id', upload.single('image'), updateProfileImage);
router.patch('/become-vendor/:id', upload.fields([
    { name: 'panDoc', maxCount: 1 },
    { name: 'gstDoc', maxCount: 1 },
    { name: 'aadharDoc', maxCount: 1 },
    { name: 'msmeDoc', maxCount: 1 },
    { name: 'franchiseDoc', maxCount: 1 },
    { name: 'chequeDoc', maxCount: 1 },
    { name: 'exteriorPhoto', maxCount: 1 },
    { name: 'interiorPhotos', maxCount: 2 },
    { name: 'walkthroughVideo', maxCount: 1 }
]), becomeVendor);
router.patch('/become-vendor/:id/submit-services', submitVendorServices);
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
router.get('/vendor-payouts/:vendorId', getVendorPayoutHistory);
router.get('/cart/:id', getDraftCart);
router.post('/cart/:id', updateDraftCart);

export default router;
