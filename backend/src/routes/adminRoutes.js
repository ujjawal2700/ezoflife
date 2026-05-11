console.log('--- ADMIN ROUTES MODULE LOADED ---');
import express from 'express';
import { 
    getPendingApprovals, 
    approveVendor, 
    approveFinalVendor,
    rejectVendor, 
    getDashboardStats,
    getAllVendors,
    getVendorById,
    getCustomers,
    deleteVendor,
    registerCustomer,
    updateVendorServiceStatus,
    uploadVendorDocument,
    getAllSuppliers,
    approveSupplier,
    rejectSupplier,
    updateSupplier,
    getSystemConfig,
    updateSystemConfig,
    getAllUsers,
    toggleUserStatus,
    deleteUser,
    clearAllUsers,
    clearAllServices,
    clearAllOrders,
    getCustomerPaymentSummary,
    getVendorPaymentSummary,
    recordVendorPayout,
    getVendorPayoutHistory
} from '../controllers/adminController.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.delete('/services-clear-all', clearAllServices);

router.get('/config', getSystemConfig);
router.post('/config', updateSystemConfig);
router.get('/stats', getDashboardStats);
router.get('/users', getAllUsers);
router.patch('/users/:id/toggle-status', toggleUserStatus);
router.delete('/users/:id', deleteUser);
router.get('/vendors', getAllVendors);
router.post('/vendors/:id/documents', upload.single('file'), uploadVendorDocument);
router.get('/vendors/:id', getVendorById);
router.patch('/vendors/:vendorId/services/:serviceId/status', updateVendorServiceStatus);
router.delete('/vendors/:id', deleteVendor);
router.get('/customers', getCustomers);
router.post('/register-customer', registerCustomer);
router.get('/pending-approvals', getPendingApprovals);
router.post('/approve-vendor/:id', approveVendor);
router.post('/reject-vendor/:id', rejectVendor);
router.delete('/users-clear-all', clearAllUsers);
router.post('/orders-clear-all', clearAllOrders);
router.get('/customer-payments', getCustomerPaymentSummary);
router.get('/vendor-payments', getVendorPaymentSummary);
router.post('/record-vendor-payout', recordVendorPayout);
router.get('/vendor-payouts/:vendorId', getVendorPayoutHistory);
router.get('/vendor-request/:id', getVendorById);
router.patch('/vendor-request/:id/approve-initial', approveVendor); 
router.patch('/vendor-request/:id/approve-final', approveFinalVendor);

// Supplier Management
router.get('/suppliers', getAllSuppliers);
router.patch('/suppliers/:id/approve', approveSupplier);
router.patch('/suppliers/:id/reject', rejectSupplier);
router.patch('/suppliers/:id', updateSupplier);
router.delete('/suppliers/:id', deleteUser); // Use generic deleteUser

// Diagnostic Route
router.get('/diagnostic', async (req, res) => {
    try {
        const User = (await import('../models/User.js')).default;
        const allUsers = await User.find({}, 'role phone').lean();
        const uniqueRoles = [...new Set(allUsers.map(u => u.role))];
        
        // Find users with role 'User' (which is not in enum) and fix them
        const invalidUsers = allUsers.filter(u => u.role === 'User');
        if (invalidUsers.length > 0) {
            await User.updateMany({ role: 'User' }, { $set: { role: 'Customer' } });
        }

        res.json({ 
            status: 'ok', 
            uniqueRolesInDB: uniqueRoles,
            fixedInvalidRoles: invalidUsers.length,
            totalUsers: allUsers.length
        });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

export default router;
