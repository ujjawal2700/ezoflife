import User from '../models/User.js';
import Job from '../models/Job.js';
import Promotion from '../models/Promotion.js';
import Order from '../models/Order.js';
import SystemConfig from '../models/SystemConfig.js';
import SupplierApplication from '../models/SupplierApplication.js';
import Payout from '../models/Payout.js';

// Get all roles pending approval
export const getPendingApprovals = async (req, res) => {
    try {
        const [pendingVendors, supplierApps] = await Promise.all([
            User.find({ 
                role: 'Vendor', 
                status: 'pending'
            }).select('-otp -otpExpiry').lean(),
            SupplierApplication.find({ status: 'Pending' }).populate('user', 'displayName phone email').lean()
        ]);
        
        // Transform SupplierApplications to match User-like structure for the frontend table
        const transformedSuppliers = supplierApps.map(app => ({
            _id: app._id,
            role: 'Supplier',
            displayName: app.fullName,
            phone: app.phone,
            email: app.email,
            createdAt: app.createdAt,
            supplierDetails: {
                businessName: app.businessName,
                address: app.businessAddress,
                gst: app.gstNumber
            },
            documents: [
                { type: 'GST Certificate', url: app.gstDoc },
                { type: 'Udyog Aadhaar', url: app.udyogAadharDoc },
                { type: 'Aadhaar Card', url: app.aadharDoc },
                { type: 'Address Proof', url: app.addressProofDoc }
            ].filter(d => d.url), // Only include documents that have a URL
            applicationId: app._id // Keep original app ID for approval/rejection
        }));

        const combined = [
            ...pendingVendors.map(v => ({ ...v, role: 'Vendor' })),
            ...transformedSuppliers
        ];
        
        res.status(200).json(combined);
    } catch (err) {
        console.error('Get Pending Approvals Error:', err);
        res.status(500).json({ message: 'Error fetching approvals' });
    }
};

// Approve a vendor
export const approveVendor = async (req, res) => {
    try {
        const { id } = req.params;
        const vendor = await User.findByIdAndUpdate(
            id, 
            { 
                status: 'approved',
                role: 'Vendor',
                displayName: (await User.findById(id))?.shopDetails?.name || 'Unnamed Vendor'
            }, 
            { new: true }
        );

        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        res.status(200).json({ message: 'Vendor approved and promoted to Vendor role', vendor });
    } catch (err) {
        console.error('Approve Vendor Error:', err);
        res.status(500).json({ message: 'Error approving vendor' });
    }
};

// Reject a vendor
export const rejectVendor = async (req, res) => {
    try {
        const { id } = req.params;
        const vendor = await User.findByIdAndUpdate(
            id, 
            { status: 'rejected' }, 
            { new: true }
        );

        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        res.status(200).json({ message: 'Vendor rejected', vendor });
    } catch (err) {
        console.error('Reject Vendor Error:', err);
        res.status(500).json({ message: 'Error rejecting vendor' });
    }
};

// Delete a vendor and all their associated data (Cascade Delete)
export const deleteVendor = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Delete associated Jobs
        await Job.deleteMany({ createdBy: id });

        // 2. Delete associated Promotions
        await Promotion.deleteMany({ vendorId: id });

        // 3. Delete associated Orders (assigned to this vendor)
        await Order.deleteMany({ vendor: id });

        // 4. Finally delete the User (Vendor)
        const vendor = await User.findByIdAndDelete(id);

        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        res.status(200).json({ 
            message: 'Vendor and all associated data deleted successfully',
            deletedVendorId: id
        });
    } catch (err) {
        console.error('Delete Vendor Error:', err);
        res.status(500).json({ message: 'Error deleting vendor and associated data' });
    }
};

// Get all suppliers
export const getAllSuppliers = async (req, res) => {
    try {
        const suppliers = await User.find({ role: 'Supplier' }).select('-otp -otpExpiry').lean();
        res.status(200).json(suppliers);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching suppliers' });
    }
};

// Approve a supplier
export const approveSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        
        // 1. Check if it's a SupplierApplication
        const application = await SupplierApplication.findById(id);
        if (application) {
            application.status = 'Approved';
            application.reviewedAt = new Date();
            await application.save();

            const user = await User.findByIdAndUpdate(
                application.user,
                { 
                    role: 'Supplier', 
                    status: 'approved',
                    displayName: application.fullName,
                    email: application.email,
                    address: application.businessAddress,
                    isProfileComplete: true
                },
                { new: true }
            );
            return res.status(200).json({ message: 'Application approved and user profile updated', user });
        }

        // 2. Fallback to direct User update (legacy)
        const supplier = await User.findByIdAndUpdate(
            id, 
            { status: 'approved', role: 'Supplier' }, 
            { new: true }
        );
        if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
        res.status(200).json({ message: 'Supplier approved', supplier });
    } catch (err) {
        console.error('Approve Supplier Error:', err);
        res.status(500).json({ message: 'Error approving supplier' });
    }
};

// Reject a supplier
export const rejectSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        // 1. Check if it's a SupplierApplication
        const application = await SupplierApplication.findById(id);
        if (application) {
            application.status = 'Rejected';
            application.rejectionReason = reason || 'Criteria not met';
            application.reviewedAt = new Date();
            await application.save();
            return res.status(200).json({ message: 'Application rejected' });
        }

        // 2. Fallback to direct User update
        const supplier = await User.findByIdAndUpdate(id, { status: 'rejected' }, { new: true });
        if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
        res.status(200).json({ message: 'Supplier rejected successfully', supplier });
    } catch (err) {
        console.error('Reject Supplier Error:', err);
        res.status(500).json({ message: 'Error rejecting supplier' });
    }
};

// Update a supplier
export const updateSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const supplier = await User.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
        res.status(200).json({ message: 'Supplier updated successfully', supplier });
    } catch (err) {
        console.error('Update Supplier Error:', err);
        res.status(500).json({ message: 'Error updating supplier' });
    }
};

// Get all users with optional role filter
export const getAllUsers = async (req, res) => {
    try {
        const { role } = req.query;
        
        // Final Strict Filter: 
        // 1. Role must NOT be Admin
        // 2. MUST BE (Customer) OR (Vendor/Supplier AND status === approved)
        let query = { 
            role: { $ne: 'Admin' },
            $or: [
                { role: 'Customer' },
                { status: 'approved' }
            ]
        };
        
        if (role && role !== 'All') {
            query.role = role;
        }

        const users = await User.find(query).select('-otp -otpExpiry').sort({ createdAt: -1 }).lean();
        res.status(200).json(users);
    } catch (err) {
        console.error('Get All Users Error:', err);
        res.status(500).json({ message: 'Error fetching users' });
    }
};

// Delete a user
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByIdAndDelete(id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting user' });
    }
};

// Clear all users except Admin
export const clearAllUsers = async (req, res) => {
    try {
        const result = await User.deleteMany({ role: { $ne: 'Admin' } });
        console.log(`🧹 [CLEANUP] Deleted ${result.deletedCount} users from system`);
        res.status(200).json({ message: 'System cleared: All users (except Admins) have been purged.' });
    } catch (err) {
        console.error('Clear All Users Error:', err);
        res.status(500).json({ message: 'Internal server error during cleanup' });
    }
};

// Toggle user status (Block/Unblock)
export const toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.status = user.status === 'approved' ? 'rejected' : 'approved';
        await user.save();

        res.status(200).json({ message: `User status changed to ${user.status}`, user });
    } catch (err) {
        res.status(500).json({ message: 'Error updating user status' });
    }
};

// Get Dashboard Stats (Enhanced for Requested Metrics)
export const getDashboardStats = async (req, res) => {
    try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const Ticket = (await import('../models/Ticket.js')).default;

        const [
            totalOrders,
            activeRiders,
            pendingIssues,
            todayOrders
        ] = await Promise.all([
            Order.countDocuments({}),
            User.countDocuments({ role: 'Rider', isOnline: true }),
            Ticket.countDocuments({ status: 'Open' }),
            Order.find({ createdAt: { $gte: startOfToday } }).select('totalAmount status deliverySlot')
        ]);

        const todayRevenue = todayOrders.reduce((acc, order) => acc + (order.totalAmount || 0), 0);
        
        // Simple logic for delayed: status not Delivered and it's from yesterday or earlier
        // (Improving this would require parsing deliverySlot.date string, but for now we check createdAt)
        const yesterday = new Date(startOfToday);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const delayedOrders = await Order.countDocuments({
            status: { $nin: ['Delivered', 'Cancelled'] },
            createdAt: { $lt: startOfToday } // Simplified delayed logic: not delivered and older than today
        });

        res.status(200).json({
            stats: {
                totalOrders,
                activeRiders,
                todayRevenue,
                pendingIssues,
                delayedOrders,
                // Keep some legacy fields for compatibility if needed
                totalUsers: await User.countDocuments({ role: 'Customer' }),
                activeVendors: await User.countDocuments({ role: 'Vendor', status: 'approved' })
            }
        });
    } catch (err) {
        console.error('Get Stats Error:', err);
        res.status(500).json({ message: 'Error fetching statistics' });
    }
};

// Get all vendors (approved or pending)
export const getAllVendors = async (req, res) => {
    try {
        let vendors = await User.find({ role: 'Vendor' }).select('-otp -otpExpiry').lean();
        res.status(200).json(vendors);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching vendors' });
    }
};

// Get single vendor with unified service catalog
export const getVendorById = async (req, res) => {
    try {
        const { id } = req.params;
        const vendor = await User.findById(id).select('-otp -otpExpiry').lean();
        if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

        // Fetch custom services from Service collection
        const Service = (await import('../models/Service.js')).default;
        const customServices = await Service.find({ vendorId: id }).lean();

        // Merge Master Services (from shopDetails) and Custom Services
        const masterServices = vendor.shopDetails?.services || [];
        const unifiedServices = [
            ...masterServices.map(s => ({ ...s, isCustom: false })),
            ...customServices.map(s => ({ 
                id: s._id, 
                name: s.name, 
                vendorRate: s.basePrice, 
                status: s.approvalStatus.toLowerCase(),
                icon: s.icon,
                isCustom: true,
                normalTime: s.normalTime,
                expressTime: s.expressTime
            }))
        ];

        vendor.shopDetails = { ...vendor.shopDetails, services: unifiedServices };
        res.status(200).json(vendor);
    } catch (err) {
        console.error('Get Vendor By ID Error:', err);
        res.status(500).json({ message: 'Error fetching vendor details' });
    }
};

// Get all customers
export const getCustomers = async (req, res) => {
    try {
        const customers = await User.find({ role: 'Customer' }).select('-otp -otpExpiry').lean();
        res.status(200).json(customers);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching customers', error: err.message });
    }
};

// Admin registering a new customer
export const registerCustomer = async (req, res) => {
    try {
        const { phone, displayName, email, address } = req.body;

        if (!phone || !displayName) {
            return res.status(400).json({ message: 'Phone and Name are required' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return res.status(400).json({ message: 'A user with this phone number already exists' });
        }

        const newCustomer = new User({
            phone,
            displayName,
            email: email || '',
            address: address || '',
            role: 'Customer',
            status: 'approved', // Admin registered customers are auto-approved
            isProfileComplete: true
        });

        await newCustomer.save();

        res.status(201).json({
            message: 'Customer registered successfully',
            user: newCustomer
        });
    } catch (err) {
        console.error('Register Customer Error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

// Update status of a specific service for a vendor
export const updateVendorServiceStatus = async (req, res) => {
    try {
        const { vendorId, serviceId } = req.params;
        const { status, message } = req.body; // status: 'approved' | 'rejected'

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const vendor = await User.findById(vendorId);
        if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

        // 1. Check Custom Services (Service Collection)
        const Service = (await import('../models/Service.js')).default;
        const mongoose = (await import('mongoose')).default;
        
        const customService = await Service.findOne({ 
            _id: serviceId,
            $or: [
                { vendorId: vendorId },
                { vendorId: mongoose.Types.ObjectId.isValid(vendorId) ? new mongoose.Types.ObjectId(vendorId) : null }
            ].filter(q => q.vendorId !== null)
        });
        
        if (customService) {
            customService.approvalStatus = status === 'approved' ? 'Approved' : 'Rejected';
            customService.status = status === 'approved' ? 'Active' : 'Suspended';
            if (status === 'rejected') customService.rejectionReason = message;
            await customService.save();
        } else {
            // 2. Check Master Services (User Collection shopDetails)
            let serviceFound = false;
            vendor.shopDetails.services = vendor.shopDetails.services.map(service => {
                if (service.id === serviceId) {
                    serviceFound = true;
                    service.status = status;
                    if (status === 'rejected') {
                        service.rejectionReason = message || 'Criteria not met';
                    } else {
                        service.rejectionReason = '';
                    }
                }
                return service;
            });

            if (!serviceFound) return res.status(404).json({ message: 'Service not found in vendor profile' });
            vendor.markModified('shopDetails.services');
            await vendor.save();
        }

        // Trigger notification to vendor
        if (status === 'rejected') {
             try {
                const Notification = (await import('../models/Notification.js')).default;
                await new Notification({
                    recipient: vendorId,
                    role: 'vendor',
                    title: 'Service Rejected',
                    message: `Your service update was rejected: ${message || 'Criteria not met'}`,
                    type: 'order_placed' // Fallback to a valid enum type
                }).save();
                console.log(`✅ [NOTIF] Rejection sent to vendor ${vendorId}`);
             } catch (notifErr) {
                 console.error('Failed to send rejection notification:', notifErr.message);
             }
        }

        res.status(200).json({ message: `Service ${status} successfully`, vendor });
    } catch (err) {
        console.error('Update Service Status Error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// System Config Controllers
export const getSystemConfig = async (req, res) => {
    try {
        let configs = await SystemConfig.find();
        
        // Auto-seed if empty
        if (configs.length === 0) {
            const defaults = [
                { key: 'express_multiplier', value: 1.5, description: 'Multiplier for Express Delivery (Multiplicative Formula)' },
                { key: 'platform_multiplier', value: 1.1, description: 'Platform Aggregator Fee Multiplier' },
                { key: 'gst_percent', value: 18, description: 'GST Percentage' },
                { key: 'normal_logistics_fee', value: 50, description: 'Base logistics fee for Normal Delivery mode' },
                { key: 'chat_welcome_message', value: 'Hello! How can we help you today?', description: 'Welcome message' },
                { key: 'delivery_day', value: 'Sunday', description: 'Global Delivery Day for B2B Supplier Orders' },
                { 
                    key: 'invoice_settings', 
                    value: {
                        showLogo: true,
                        showVendorDetails: true,
                        showTerms: true,
                        customTerms: 'Thank you for taking our services..',
                        invoiceNote: 'This is a computer generated invoice.',
                        showTaxes: false,
                        accentColor: '#000000',
                        businessName: 'SPINZYT',
                        contactEmail: 'support@spinzyt.com'
                    }, 
                    description: 'Invoice Template Configuration' 
                }
            ];
            await SystemConfig.insertMany(defaults);
            configs = await SystemConfig.find();
        }
        
        res.status(200).json(configs);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching config' });
    }
};

export const updateSystemConfig = async (req, res) => {
    try {
        const { key, value } = req.body;
        const config = await SystemConfig.findOneAndUpdate(
            { key },
            { value },
            { upsert: true, new: true }
        );
        res.status(200).json(config);
    } catch (err) {
        res.status(500).json({ message: 'Error updating config' });
    }
};

// Upload document for a vendor by Admin
export const uploadVendorDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const vendor = await User.findById(id);
        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        // Add to documents array
        vendor.documents.push({
            type: type || 'Other',
            url: req.file.path // This will be the Cloudinary URL from multer-storage-cloudinary
        });

        await vendor.save();

        res.status(200).json({
            message: 'Document uploaded successfully',
            documents: vendor.documents
        });
    } catch (err) {
        console.error('Admin Document Upload Error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};

// Clear all services
export const clearAllServices = async (req, res) => {
    try {
        const Service = (await import('../models/Service.js')).default;
        await Service.deleteMany({});
        res.status(200).json({ message: 'All services cleared successfully' });
    } catch (err) {
        console.error('Clear Services Error:', err);
        res.status(500).json({ message: 'Error clearing services' });
    }
};

// Clear all orders
export const clearAllOrders = async (req, res) => {
    console.log('🗑️ [ADMIN_PURGE] Received request to clear all orders');
    try {
        const result = await Order.deleteMany({});
        console.log(`🧹 [CLEANUP] Deleted ${result.deletedCount} orders from system`);
        res.status(200).json({ message: 'System cleared: All orders have been purged.' });
    } catch (err) {
        console.error('Clear All Orders Error:', err);
        res.status(500).json({ message: 'Internal server error during order cleanup' });
    }
};

// Get payment summary for all customers
export const getCustomerPaymentSummary = async (req, res) => {
    try {
        const customers = await User.find({ role: 'Customer' }).select('displayName phone email').lean();
        
        const summary = await Promise.all(customers.map(async (cust) => {
            const orders = await Order.find({ customer: cust._id }).select('totalAmount advanceAmount dueAmount status paymentStatus').lean();
            
            const totalOrders = orders.length;
            const totalSpent = orders.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
            const totalAdvancePaid = orders.reduce((acc, curr) => acc + (curr.advanceAmount || 0), 0);
            
            // COD Paid: Only if status is Delivered
            const totalCodPaid = orders
                .filter(o => o.status === 'Delivered')
                .reduce((acc, curr) => acc + (curr.dueAmount || 0), 0);
            
            const totalPaid = totalAdvancePaid + totalCodPaid;
            const pendingBalance = totalSpent - totalPaid;

            return {
                _id: cust._id,
                displayName: cust.displayName,
                phone: cust.phone,
                email: cust.email,
                totalOrders,
                totalSpent,
                totalAdvancePaid,
                totalCodPaid,
                totalPaid,
                pendingBalance
            };
        }));

        res.status(200).json(summary);
    } catch (err) {
        console.error('Get Customer Payment Summary Error:', err);
        res.status(500).json({ message: 'Error fetching payment summary', error: err.message });
    }
};

// Get payment summary for all vendors
export const getVendorPaymentSummary = async (req, res) => {
    try {
        const vendors = await User.find({ role: 'Vendor', status: 'approved' }).select('displayName phone email shopDetails').lean();
        
        const summary = await Promise.all(vendors.map(async (vendor) => {
            // Vendor Earnings = baseWithArea + expressSurcharge from priceBreakdown
            // Only for Ready or Delivered orders (where work is done)
            const orders = await Order.find({ 
                vendor: vendor._id,
                status: { $in: ['Ready', 'Delivered', 'Out for Delivery'] }
            }).select('priceBreakdown status orderId').lean();
            
            const totalEarnings = orders.reduce((acc, curr) => {
                const breakdown = curr.priceBreakdown || {};
                return acc + (breakdown.baseWithArea || 0) + (breakdown.expressSurcharge || 0);
            }, 0);
            
            // Total Paid by Admin to Vendor
            const payouts = await Payout.find({ vendor: vendor._id, status: 'Completed' }).select('amount').lean();
            const totalPaid = payouts.reduce((acc, curr) => acc + (curr.amount || 0), 0);
            
            const pendingBalance = totalEarnings - totalPaid;

            return {
                _id: vendor._id,
                displayName: vendor.displayName,
                shopName: vendor.shopDetails?.name || 'N/A',
                phone: vendor.phone,
                email: vendor.email,
                totalOrders: orders.length,
                totalEarnings,
                totalPaid,
                pendingBalance,
                lastPayout: payouts.length > 0 ? payouts[payouts.length - 1].paidAt : null
            };
        }));

        res.status(200).json(summary);
    } catch (err) {
        console.error('Get Vendor Payment Summary Error:', err);
        res.status(500).json({ message: 'Error fetching vendor payment summary', error: err.message });
    }
};

// Record a new payout to a vendor
export const recordVendorPayout = async (req, res) => {
    try {
        const { vendorId, amount, transactionId, paymentMethod, notes } = req.body;
        
        if (!vendorId || !amount || !transactionId) {
            return res.status(400).json({ message: 'Vendor, Amount and Transaction ID are required' });
        }

        const payout = new Payout({
            vendor: vendorId,
            amount,
            transactionId,
            paymentMethod,
            notes,
            status: 'Completed'
        });

        await payout.save();

        res.status(201).json({
            message: 'Payout recorded successfully',
            payout
        });
    } catch (err) {
        console.error('Record Payout Error:', err);
        res.status(500).json({ message: 'Error recording payout', error: err.message });
    }
};

// Get payout history for a specific vendor
export const getVendorPayoutHistory = async (req, res) => {
    try {
        const { vendorId } = req.params;
        const payouts = await Payout.find({ vendor: vendorId }).sort({ paidAt: -1 }).lean();
        res.status(200).json(payouts);
    } catch (err) {
        console.error('Get Payout History Error:', err);
        res.status(500).json({ message: 'Error fetching payout history', error: err.message });
    }
};
