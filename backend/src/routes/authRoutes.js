import express from 'express';
import { 
    requestOtp, 
    verifyOtp, 
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
    updateDraftCart,
    lookupCustomerByPhone
} from '../controllers/authController.js';
import { getAdminInvite, acceptAdminInvite } from '../controllers/adminInviteController.js';
import { getVendorPayoutHistory } from '../controllers/adminController.js';
import upload from '../middleware/upload.js';
import { verifyAdmin, verifyUser, requireSelfOrAdmin, requireRole } from '../middleware/authMiddleware.js';

// Account routes addressed by id: the caller must be that account or an Admin
const self = (param = 'id') => [verifyUser, requireSelfOrAdmin(param)];

// For routes that address the account by the phone in the (multipart) body
const ownPhoneOrAdmin = (req, res, next) => {
    if (req.user?.role === 'Admin' || String(req.body?.phone || '') === String(req.user?.phone || '')) return next();
    return res.status(403).json({ success: false, message: 'You can only update your own account.' });
};

const router = express.Router();

// Sub-admin invitation (public: the emailed token is the credential)
router.get('/admin-invite', getAdminInvite);
router.post('/admin-invite/accept', acceptAdminInvite);

// DEV SCAFFOLDING — provisions a hardcoded account with a known OTP. Gated to
// Admin so it is no longer a public backdoor; it should be deleted outright once
// nothing depends on it.
router.post('/temp-seed', (req, res, next) => (
    process.env.NODE_ENV === 'production' ? res.status(404).json({ message: 'Not found' }) : next()
), verifyAdmin, tempSeedUser);
router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtp);
router.post('/update-fcm-token', verifyUser, updateFcmToken);
router.post('/register-vendor', verifyAdmin, registerVendor);
router.post('/vendor-login', vendorLogin);
router.post('/complete-vendor-profile', verifyUser, upload.fields([
    { name: 'gstDoc', maxCount: 1 },
    { name: 'msmeDoc', maxCount: 1 }
]), ownPhoneOrAdmin, completeVendorProfile);

router.get('/get-status', getStatus);
router.get('/profile/:id', ...self(), getUserProfile);
router.get('/lookup-phone/:phone', verifyUser, requireRole('Vendor', 'Admin'), lookupCustomerByPhone);
router.patch('/profile/update/:id', ...self(), updateUserProfile);
router.patch('/update-documents/:id', ...self(), upload.single('document'), updateVendorDocuments);
router.patch('/update-profile-image/:id', ...self(), upload.single('image'), updateProfileImage);
router.patch('/become-vendor/:id', ...self(), upload.fields([
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
router.patch('/become-vendor/:id/submit-services', ...self(), submitVendorServices);
router.post('/become-supplier/:id', ...self(), (req, res, next) => {
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

router.get('/vendor-earnings', ...self('vendorId'), getVendorEarnings);
router.get('/vendor-payouts/:vendorId', ...self('vendorId'), getVendorPayoutHistory);
router.get('/cart/:id', ...self(), getDraftCart);
router.post('/cart/:id', ...self(), updateDraftCart);

export default router;
