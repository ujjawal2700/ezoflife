import express from 'express';
import { 
    createOrder, 
    getMyOrders, 
    getVendorOrders, 
    updateOrderStatus, 
    getAllOrders,
    getRiderTasks,
    acceptOrder,
    verifyPickupOtp,
    getRiderStats,
    getOrderById,
    vendorAcceptOrder,
    getPoolOrders,
    verifyDeliveryOtp,
    deleteOrder,
    createWalkInOrder,
    markOrderReady,
    verifyHandshake,
    handleGetNearbyVendors
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

// Update order status
router.patch('/status/:id', updateOrderStatus);
router.post('/mark-ready/:id', markOrderReady);
router.post('/verify-handshake/:id', verifyHandshake);

// Rider Specific Routes
router.post('/accept/:id', acceptOrder);
router.post('/verify-pickup/:id', verifyPickupOtp);
router.post('/verify-delivery/:id', verifyDeliveryOtp);
router.get('/rider/:riderId', getRiderTasks);
router.get('/rider-stats/:riderId', getRiderStats);

// Admin: Get all orders
router.get('/all', getAllOrders);
router.delete('/:id', deleteOrder);

// Specific order by ID (Must be at the bottom)
router.get('/:id', getOrderById);

export default router;
