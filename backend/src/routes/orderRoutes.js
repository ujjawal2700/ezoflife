import express from 'express';
import { 
    createOrder, 
    getMyOrders, 
    getVendorOrders, 
    updateOrderStatus, 
    getAllOrders,
    getOrderById,
    vendorAcceptOrder,
    getPoolOrders,
    deleteOrder,
    createWalkInOrder,
    markOrderReady,
    verifyHandshake,
    handleGetNearbyVendors,
    createRazorpayOrder,
    cancelOrder
} from '../controllers/orderController.js';
import { verifyAdmin, verifyAdminOrVendor, verifyUser } from '../middleware/authMiddleware.js';

const router = express.Router();

// Diagnostic
router.get('/trace', (req, res) => res.json({ msg: 'Order Router is ALIVE' }));

// ─── Reads ────────────────────────────────────────────────────────────────────
// Authenticated so a caller can only ask about their own scope; the handlers
// narrow further (a customer sees their orders, a vendor sees theirs).
router.get('/pool', verifyUser, getPoolOrders);
router.get('/vendor', verifyUser, getVendorOrders);
router.get('/my', verifyUser, getMyOrders);
router.get('/nearby-vendors', verifyUser, handleGetNearbyVendors);

// ─── Writes ───────────────────────────────────────────────────────────────────
// Every mutation requires a token. Identity is taken from that token inside the
// handlers — a body-supplied customerId is honoured for Admins only.
router.post('/vendor-accept/:id', verifyUser, vendorAcceptOrder);

router.post('/', verifyUser, createOrder);
router.post('/walk-in', verifyAdminOrVendor, createWalkInOrder);   // raised at the counter
router.post('/razorpay', verifyUser, createRazorpayOrder);

router.patch('/status/:id', verifyUser, updateOrderStatus);
router.post('/mark-ready/:id', verifyUser, markOrderReady);
router.post('/verify-handshake/:id', verifyUser, verifyHandshake);
router.post('/cancel/:id', verifyUser, cancelOrder);

// ─── Admin only ───────────────────────────────────────────────────────────────
router.get('/all', verifyAdmin, getAllOrders);
// Destructive: deleting an order is not something a customer or vendor may do.
router.delete('/:id', verifyAdmin, deleteOrder);

// Specific order by ID (Must be at the bottom). Ownership is enforced in the
// handler so a customer cannot read somebody else's order.
router.get('/:id', verifyUser, getOrderById);

export default router;
