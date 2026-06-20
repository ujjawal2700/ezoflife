import express from 'express';
const router = express.Router();
import * as b2bController from '../controllers/b2bOrderController.js';

import { verifyAdmin } from '../middleware/authMiddleware.js';

router.post('/place', b2bController.placeB2BOrder);
router.get('/supplier/:supplierId', b2bController.getSupplierOrders);
router.get('/vendor/:vendorId', b2bController.getVendorOrders);
router.get('/:id', b2bController.getB2BOrderById);
router.patch('/:id/status', b2bController.updateB2BStatus);
router.patch('/:id/delivery-date', b2bController.updateB2BDeliveryDate);
router.post('/bulk-status-update', b2bController.bulkUpdateB2BStatus);
router.post('/verify-platform-fee', b2bController.verifyPlatformFeePayment);
router.post('/initiate-payment', b2bController.initiateB2BPayment);
router.post('/verify-payment', b2bController.verifyB2BPayment);
router.get('/admin/escrow', verifyAdmin, b2bController.getAdminEscrowOrders);
router.patch('/:id/release', verifyAdmin, b2bController.releaseSupplierPayment);
router.get('/timeline', b2bController.getSupplierTimeline);

export default router;
