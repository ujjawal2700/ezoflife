import express from 'express';
const router = express.Router();
import * as b2bController from '../controllers/b2bOrderController.js';

import { verifyAdmin } from '../middleware/authMiddleware.js';

// Literal paths MUST be declared before the '/:id' wildcard. Express matches in
// declaration order, so '/timeline' and '/admin/escrow' were previously captured
// by '/:id', which then tried to cast "timeline" to an ObjectId and returned 500.
// Both endpoints were unreachable.
router.get('/timeline', b2bController.getSupplierTimeline);
router.get('/admin/escrow', verifyAdmin, b2bController.getAdminEscrowOrders);
router.get('/supplier/:supplierId', b2bController.getSupplierOrders);
router.get('/vendor/:vendorId', b2bController.getVendorOrders);

router.post('/place', b2bController.placeB2BOrder);
router.post('/bulk-status-update', b2bController.bulkUpdateB2BStatus);
router.post('/verify-platform-fee', b2bController.verifyPlatformFeePayment);
router.post('/initiate-payment', b2bController.initiateB2BPayment);
router.post('/verify-payment', b2bController.verifyB2BPayment);

// Wildcard routes last.
router.get('/:id', b2bController.getB2BOrderById);
router.patch('/:id/status', b2bController.updateB2BStatus);
router.post('/:id/verify-otp', b2bController.verifyDeliveryOtp);
router.patch('/:id/delivery-date', b2bController.updateB2BDeliveryDate);
router.patch('/:id/release', verifyAdmin, b2bController.releaseSupplierPayment);

export default router;
