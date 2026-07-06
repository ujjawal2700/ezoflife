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

const router = express.Router();

// Diagnostic
router.get('/trace', (req, res) => res.json({ msg: 'Order Router is ALIVE' }));

// Get pool orders (unassigned) - MUST BE ABOVE /:id
router.get('/pool', getPoolOrders);
router.get('/vendor', getVendorOrders);
router.get('/my', getMyOrders);
router.get('/nearby-vendors', handleGetNearbyVendors);
router.post('/vendor-accept/:id', vendorAcceptOrder);

// Create new order
router.post('/', createOrder);
router.post('/walk-in', createWalkInOrder);
router.post('/razorpay', createRazorpayOrder);

// Update order status
router.patch('/status/:id', updateOrderStatus);
router.post('/mark-ready/:id', markOrderReady);
router.post('/verify-handshake/:id', verifyHandshake);
router.post('/cancel/:id', cancelOrder);

// Rider Specific Routes (Decommissioned - Handled by Shiprocket/LogisticsController)

// Admin: Get all orders
router.get('/all', getAllOrders);
router.delete('/:id', deleteOrder);

// Specific order by ID (Must be at the bottom)
router.get('/:id', getOrderById);

export default router;
