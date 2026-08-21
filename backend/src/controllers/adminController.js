import User from '../models/User.js';
import Job from '../models/Job.js';
import Promotion from '../models/Promotion.js';
import Order from '../models/Order.js';
import SystemConfig from '../models/SystemConfig.js';
import SupplierApplication from '../models/SupplierApplication.js';
import Payout from '../models/Payout.js';
import SupplierServiceZone from '../models/SupplierServiceZone.js';
import VendorMasterSupply from '../models/VendorMasterSupply.js';
import VendorSupplyCategory from '../models/VendorSupplyCategory.js';
import { v2 as cloudinary } from 'cloudinary';

// Helper: Ray casting algorithm to check if point is in polygon
const isPointInPolygon = (lat, lng, polygonCoords) => {
    let inside = false;
    const x = lng;
    const y = lat;
    for (let i = 0, j = polygonCoords.length - 1; i < polygonCoords.length; j = i++) {
        const xi = polygonCoords[i][0];
        const yi = polygonCoords[i][1];
        const xj = polygonCoords[j][0];
        const yj = polygonCoords[j][1];
        const intersect = ((yi > y) !== (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};

// Helper to filter items (users or transformed entries) by admin geofence restrictions
const filterUsersByGeofence = async (users, adminId) => {
    try {
        if (!adminId) return users;
        const adminUser = await User.findById(adminId);
        if (!adminUser || !adminUser.geofenceRestrictions || adminUser.geofenceRestrictions.length === 0) {
            return users;
        }

        const ServiceArea = (await import('../models/ServiceArea.js')).default;
        const serviceAreas = await ServiceArea.find({ isActive: true });

        return users.filter(u => {
            let lat = u.location?.lat;
            let lng = u.location?.lng;

            if (!lat && !lng) {
                lat = u.shopDetails?.location?.lat || u.supplierDetails?.location?.lat;
                lng = u.shopDetails?.location?.lng || u.supplierDetails?.location?.lng;
            }

            if (!lat && !lng && u.addresses && u.addresses.length > 0) {
                lat = u.addresses[0].location?.lat;
                lng = u.addresses[0].location?.lng;
            }

            if (!lat || !lng) {
                return false;
            }

            let zoneName = 'N/A';
            for (const area of serviceAreas) {
                if (area.boundary?.coordinates?.[0]) {
                    const polygonCoords = area.boundary.coordinates[0];
                    if (isPointInPolygon(lat, lng, polygonCoords)) {
                        zoneName = area.areaName;
                        break;
                    }
                }
            }
            return adminUser.geofenceRestrictions.includes(zoneName);
        });
    } catch (e) {
        console.error('Error filtering users by geofence:', e);
        return users;
    }
};

// Get all roles pending approval
export const getPendingApprovals = async (req, res) => {
    try {
        const { vendorName, businessName, phone } = req.query;

        const userQuery = {
            $or: [
                { role: 'Vendor' },
                { onboardingStage: { $in: ['INITIAL_REVIEW', 'SERVICE_SELECTION', 'FINAL_REVIEW', 'COMPLETED'] } }
            ]
        };

        if (vendorName && vendorName.trim() !== '') {
            userQuery.displayName = vendorName.trim();
        }
        if (businessName && businessName.trim() !== '') {
            userQuery['shopDetails.name'] = businessName.trim();
        }
        if (phone && phone.trim() !== '') {
            userQuery.phone = phone.trim();
        }

        const supplierQuery = { status: 'Pending' };

        if (vendorName && vendorName.trim() !== '') {
            supplierQuery.contactPersonName = { $regex: vendorName.trim(), $options: 'i' };
        }
        if (businessName && businessName.trim() !== '') {
            supplierQuery.registeredBusinessName = { $regex: businessName.trim(), $options: 'i' };
        }
        if (phone && phone.trim() !== '') {
            const matchingUsers = await User.find({ phone }).select('_id');
            const userIds = matchingUsers.map(u => u._id);
            supplierQuery.user = { $in: userIds };
        }

        const [pendingVendors, supplierApps] = await Promise.all([
            User.find(userQuery).select('-otp -otpExpiry').lean(),
            SupplierApplication.find(supplierQuery).populate('user', 'displayName phone email').lean()
        ]);
        
        // Transform SupplierApplications to match User-like structure for the frontend table
        const transformedSuppliers = supplierApps.map(app => ({
            _id: app._id,
            role: 'Supplier',
            displayName: app.user?.displayName || app.contactPersonName || '',
            phone: app.user?.phone || '',
            email: app.user?.email || '',
            createdAt: app.createdAt,
            location: app.warehouseLocation || app.location || null,
            supplierDetails: {
                businessName: app.registeredBusinessName || '',
                address: app.warehouseAddress || '',
                gst: app.gstNumber || ''
            },
            documents: [
                { type: 'GST Certificate', url: app.gstDoc },
                { type: 'PAN Card', url: app.panDoc },
                { type: 'MSME Copy', url: app.msmeDoc },
                { type: 'Manufacturer Auth', url: app.manufacturerAuthDoc }
            ].filter(d => d.url), // Only include documents that have a URL
            applicationId: app._id // Keep original app ID for approval/rejection
        }));

        let filteredVendors = pendingVendors;
        let filteredSuppliers = transformedSuppliers;

        if (req.admin && req.admin.id) {
            filteredVendors = await filterUsersByGeofence(pendingVendors, req.admin.id);
            filteredSuppliers = await filterUsersByGeofence(transformedSuppliers, req.admin.id);
        }

        const combined = [
            ...filteredVendors.map(v => ({ ...v, role: 'Vendor' })), // Force role to Vendor for display
            ...filteredSuppliers
        ];
        
        res.status(200).json(combined);
    } catch (err) {
        console.error('Get Pending Approvals Error:', err);
        res.status(500).json({ message: 'Error fetching approvals' });
    }
};

// Approve a vendor (Initial Audit)
export const approveVendor = async (req, res) => {
    try {
        const { id } = req.params;
        const { tier } = req.body;
        
        const vendor = await User.findById(id);
        if (!vendor) return res.status(404).json({ message: 'Vendor request not found' });

        // Phase 1 Approval: Keep role as Customer, move to Service Selection
        vendor.tier = tier || vendor.tier || 'Standard';
        vendor.onboardingStage = 'SERVICE_SELECTION';
        vendor.status = 'approved'; // Initially approved for documentation

        await vendor.save();

        res.status(200).json({ 
            message: 'Initial audit complete. Application sent back for service selection.', 
            vendor 
        });
    } catch (err) {
        console.error('Approve Vendor Error:', err);
        res.status(500).json({ message: 'Error during initial audit' });
    }
};

// Final Approval: Convert to Vendor
export const approveFinalVendor = async (req, res) => {
    try {
        const { id } = req.params;
        const vendor = await User.findById(id);
        if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

        vendor.role = 'Vendor';
        vendor.status = 'approved';
        vendor.onboardingStage = 'COMPLETED';

        // Approve all selected onboarding services
        if (vendor.shopDetails && vendor.shopDetails.services) {
            vendor.shopDetails.services.forEach(svc => {
                if (svc.status === 'pending') {
                    svc.status = 'approved';
                }
            });
        }
        
        await vendor.save();
        res.status(200).json({ message: 'Vendor officially onboarded!', vendor });
    } catch (err) {
        console.error('Final Approval Error:', err);
        res.status(500).json({ message: 'Error during final onboarding' });
    }
};

// Reject or Request Revision for a vendor
export const rejectVendor = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, status, rejectionFlags } = req.body; // status can be 'rejected' or 'revision_required'
        
        const targetStatus = status || 'rejected';

        const vendor = await User.findByIdAndUpdate(
            id, 
            { 
                status: targetStatus,
                rejectionReason: reason || 'Criteria not met',
                rejectionFlags: rejectionFlags || []
            }, 
            { new: true }
        );

        if (!vendor) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        res.status(200).json({ 
            message: `Vendor application ${targetStatus === 'revision_required' ? 'sent for revision' : 'rejected'}`, 
            vendor 
        });
    } catch (err) {
        console.error('Reject Vendor Error:', err);
        res.status(500).json({ message: 'Error updating vendor status' });
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
        let suppliers = await User.find({ role: 'Supplier' }).select('-otp -otpExpiry').lean();
        
        if (req.admin && req.admin.id) {
            suppliers = await filterUsersByGeofence(suppliers, req.admin.id);
        }

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

            const userObj = await User.findById(application.user);
            const userPhone = userObj?.phone || '';
            const supplierId = `SUP-${userPhone ? userPhone.slice(-4) : '001'}`;

            const user = await User.findByIdAndUpdate(
                application.user,
                { 
                      role: 'Supplier', 
                      status: 'approved',
                      displayName: application.contactPersonName || userObj?.displayName || '',
                      email: userObj?.email || '',
                      address: application.warehouseAddress || '',
                      isProfileComplete: true,
                      supplierDetails: {
                          businessName: application.registeredBusinessName || '',
                          address: application.warehouseAddress || '',
                          city: application.city || '',
                          pincode: application.pincode || '',
                          gst: application.gstNumber || '',
                          supplyCategories: application.supplyCategories || [],
                          entityType: application.entityType || '',
                          designation: application.designation || '',
                          panNumber: application.panNumber || '',
                          aadhaarNumber: application.ownerAadhaar || ''
                      },
                      bankDetails: {
                          accountHolderName: application.contactPersonName || '',
                          accountNumber: application.accountNumber || '',
                          ifscCode: application.ifscCode || '',
                          bankName: application.bankName || ''
                      }
                },
                { new: true }
            );

            // Automatically create SupplierServiceZone record if zone and pincode exist
            if (application.zone && application.pincode) {
                // Auto-generate zoneId (Starts from SPZ-ZONE-001, SPZ-ZONE-002...)
                const lastZone = await SupplierServiceZone.findOne({ zoneId: { $regex: /^SPZ-ZONE-/ } }).sort({ zoneId: -1 });
                let nextNum = 1;
                if (lastZone && lastZone.zoneId) {
                    const match = lastZone.zoneId.match(/^SPZ-ZONE-(\d+)$/);
                    if (match) {
                        nextNum = parseInt(match[1], 10) + 1;
                    }
                }
                const zoneId = `SPZ-ZONE-${String(nextNum).padStart(3, '0')}`;

                const newZone = new SupplierServiceZone({
                    zoneId,
                    zoneName: application.zone,
                    supplierId: supplierId,
                    pincodes: [application.pincode],
                    deliveryCharges: 0,
                    minOrderValue: 0,
                    isActive: true
                });
                await newZone.save();
            }

            // Clone the selected products into VendorMasterSupply with this supplierId & supplierFacilityName
            if (application.selectedProducts && application.selectedProducts.length > 0) {
                for (const selectedItem of application.selectedProducts) {
                    // Ensure we don't duplicate clone for the same supplier
                    const exists = await VendorMasterSupply.findOne({
                        materialName: selectedItem.productName,
                        supplierId: supplierId
                    });
                    
                    if (!exists) {
                        // Find template supply item
                        const templateItem = await VendorMasterSupply.findOne({
                            materialName: selectedItem.productName,
                            supplierId: '-'
                        });
                        
                        if (templateItem) {
                            const lastSupply = await VendorMasterSupply.findOne().sort({ serialNumber: -1 });
                            const nextSerial = (lastSupply?.serialNumber || 0) + 1;
                            
                            const categoryDoc = await VendorSupplyCategory.findById(templateItem.categoryId);
                            
                            // Generate SKU ID
                            const prefix1 = "spz";
                            const prefix2 = "sup";
                            let catPart = "cat";
                            if (categoryDoc && categoryDoc.mainCategory) {
                                catPart = categoryDoc.mainCategory.trim().replace(/[^a-zA-Z\s]/g, '').slice(0, 3).toLowerCase();
                                if (!catPart) catPart = "cat";
                            }
                            let subPart = "sub";
                            if (categoryDoc && categoryDoc.subCategory) {
                                const words = categoryDoc.subCategory.trim().replace(/[^a-zA-Z\s]/g, '').split(/\s+/).filter(Boolean);
                                if (words.length >= 2) {
                                    subPart = (words[0][0] + words[1][0]).toLowerCase();
                                } else if (words.length === 1) {
                                    subPart = words[0].slice(0, 2).toLowerCase();
                                }
                                if (!subPart) subPart = "sub";
                            }
                            const serialStr = String(nextSerial).padStart(3, '0');
                            const newSkuId = `${prefix1}-${prefix2}-${catPart}-${subPart}-${serialStr}`.toUpperCase();

                            const newSupply = new VendorMasterSupply({
                                skuId: newSkuId,
                                categoryId: templateItem.categoryId,
                                hsnCode: templateItem.hsnCode || '-',
                                gst: templateItem.gst || 18,
                                brand: templateItem.brand || 'Generic',
                                materialName: templateItem.materialName,
                                quantity: templateItem.quantity || '-',
                                wholesaleRate: selectedItem.wholesaleRate || 0,
                                bulkDiscount: selectedItem.bulkDiscount || 0,
                                bulkThreshold: selectedItem.bulkThreshold || 0,
                                isActive: 'y',
                                deliveryFrequency: (application.deliveryFrequency && application.deliveryFrequency.length > 0)
                                    ? application.deliveryFrequency.join(', ')
                                    : '-',
                                movFreeDelivery: selectedItem.movFreeDelivery || 0,
                                supplierId: supplierId,
                                supplierFacilityName: application.registeredBusinessName,
                                serialNumber: nextSerial
                            });
                            
                            await newSupply.save();
                        }
                    }
                }
            }

            application.onboardingStage = 'Onboarded';
            await application.save();

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
        const { rejectionFlags } = req.body;
        const supplier = await User.findByIdAndUpdate(
            id, 
            { 
                status: 'revision_required',
                rejectionReason: reason || 'Revision required for some documents',
                rejectionFlags: rejectionFlags || []
            }, 
            { new: true }
        );
        if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
        res.status(200).json({ message: 'Supplier marked for revision', supplier });
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
        const ServiceArea = (await import('../models/ServiceArea.js')).default;
        const MasterService = (await import('../models/MasterService.js')).default;
        const Service = (await import('../models/Service.js')).default;
        const Advertisement = (await import('../models/Advertisement.js')).default;
        const Material = (await import('../models/Material.js')).default;
        const JobApplication = (await import('../models/JobApplication.js')).default;

        // Group orders by month for the last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const [
            totalOrders,
            activeRiders,
            pendingIssues,
            todayOrders,
            totalRevenueOrders,
            totalVendors,
            approvedVendors,
            rejectedVendors,
            totalSuppliers,
            approvedSuppliers,
            rejectedSuppliers,
            totalGeofences,
            activeGeofences,
            totalServices,
            masterServices,
            totalTickets,
            resolvedTickets,
            unresolvedTickets,
            totalAds,
            activeAds,
            inactiveAds,
            totalProducts,
            activeProducts,
            outOfStockProducts,
            totalCareerRequests,
            pendingCareerRequests,
            reviewedCareerRequests,
            totalServiceRequests,
            pendingServiceRequests,
            approvedServiceRequests,
            rejectedServiceRequests,
            monthlyRevenueOrders
        ] = await Promise.all([
            Order.countDocuments({}),
            User.countDocuments({ role: 'Rider', isOnline: true }),
            Ticket.countDocuments({ status: 'Open' }),
            Order.find({ createdAt: { $gte: startOfToday } }).select('totalAmount status deliverySlot'),
            Order.find({ status: { $ne: 'Cancelled' } }).select('totalAmount'),
            
            User.countDocuments({ role: 'Vendor' }),
            User.countDocuments({ role: 'Vendor', status: 'approved' }),
            User.countDocuments({ role: 'Vendor', status: 'rejected' }),
            
            User.countDocuments({ role: 'Supplier' }),
            User.countDocuments({ role: 'Supplier', status: 'approved' }),
            User.countDocuments({ role: 'Supplier', status: 'rejected' }),
            
            ServiceArea.countDocuments({}),
            ServiceArea.countDocuments({ isActive: true }),
            
            MasterService.countDocuments({}),
            MasterService.countDocuments({ isActive: true }),
            
            Ticket.countDocuments({}),
            Ticket.countDocuments({ status: { $in: ['Resolved', 'Closed'] } }),
            Ticket.countDocuments({ status: { $in: ['Open', 'In Progress'] } }),
            
            Advertisement.countDocuments({}),
            Advertisement.countDocuments({ isActive: true }),
            Advertisement.countDocuments({ isActive: false }),
            
            Material.countDocuments({}),
            Material.countDocuments({ status: 'active' }),
            Material.countDocuments({ status: 'out_of_stock' }),
            
            JobApplication.countDocuments({}),
            JobApplication.countDocuments({ status: 'Pending' }),
            JobApplication.countDocuments({ status: { $ne: 'Pending' } }),
            
            Service.countDocuments({ isMaster: false }),
            Service.countDocuments({ isMaster: false, approvalStatus: 'Pending' }),
            Service.countDocuments({ isMaster: false, approvalStatus: 'Approved' }),
            Service.countDocuments({ isMaster: false, approvalStatus: 'Rejected' }),
            
            Order.find({
                status: { $ne: 'Cancelled' },
                createdAt: { $gte: sixMonthsAgo }
            }).select('totalAmount createdAt')
        ]);

        const todayRevenue = todayOrders.reduce((acc, order) => acc + (order.totalAmount || 0), 0);
        const totalRevenue = totalRevenueOrders.reduce((acc, order) => acc + (order.totalAmount || 0), 0);

        // Simple logic for delayed: status not Delivered and it's from yesterday or earlier
        const delayedOrders = await Order.countDocuments({
            status: { $nin: ['Delivered', 'Cancelled'] },
            createdAt: { $lt: startOfToday }
        });

        // Initialize last 6 months for chart
        const monthsList = [];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            monthsList.push({
                name: monthNames[d.getMonth()],
                year: d.getFullYear(),
                monthIndex: d.getMonth(),
                revenue: 0
            });
        }

        monthlyRevenueOrders.forEach(order => {
            const orderDate = new Date(order.createdAt);
            const monthIdx = orderDate.getMonth();
            const year = orderDate.getFullYear();
            const targetMonth = monthsList.find(m => m.monthIndex === monthIdx && m.year === year);
            if (targetMonth) {
                targetMonth.revenue += (order.totalAmount || 0);
            }
        });

        const revenueTrend = monthsList.map(m => ({ name: m.name, revenue: m.revenue }));

        res.status(200).json({
            stats: {
                totalOrders,
                activeRiders,
                todayRevenue,
                pendingIssues,
                delayedOrders,
                totalUsers: await User.countDocuments({ role: 'Customer' }),
                activeVendors: await User.countDocuments({ role: 'Vendor', status: 'approved' }),

                // Live dashboard enhanced stats
                totalRevenue,
                revenueTrend,
                vendors: {
                    total: totalVendors,
                    approved: approvedVendors,
                    rejected: rejectedVendors
                },
                suppliers: {
                    total: totalSuppliers,
                    approved: approvedSuppliers,
                    rejected: rejectedSuppliers
                },
                geofences: {
                    total: totalGeofences,
                    active: activeGeofences
                },
                services: {
                    total: totalServices,
                    masterActive: masterServices
                },
                tickets: {
                    total: totalTickets,
                    resolved: resolvedTickets,
                    unresolved: unresolvedTickets
                },
                advertisements: {
                    total: totalAds,
                    active: activeAds,
                    inactive: inactiveAds
                },
                products: {
                    total: totalProducts,
                    active: activeProducts,
                    outOfStock: outOfStockProducts
                },
                careerRequests: {
                    total: totalCareerRequests,
                    pending: pendingCareerRequests,
                    reviewed: reviewedCareerRequests
                },
                serviceRequests: {
                    total: totalServiceRequests,
                    pending: pendingServiceRequests,
                    approved: approvedServiceRequests,
                    rejected: rejectedServiceRequests
                }
            }
        });
    } catch (err) {
        console.error('Get Stats Error:', err);
        res.status(500).json({ message: 'Error fetching statistics' });
    }
};

// Get Cloudinary Usage Stats
export const getCloudinaryUsage = async (req, res) => {
    try {
        const usage = await cloudinary.api.usage();
        res.status(200).json(usage);
    } catch (err) {
        console.error('Cloudinary Usage Error:', err);
        res.status(500).json({ message: 'Error fetching cloudinary usage', error: err.message });
    }
};

// Get all vendors (approved or pending)
export const getAllVendors = async (req, res) => {
    try {
        let vendors = await User.find({ role: 'Vendor' }).select('-otp -otpExpiry').lean();
        
        if (req.admin && req.admin.id) {
            vendors = await filterUsersByGeofence(vendors, req.admin.id);
        }

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
        let customers = await User.find({ role: 'Customer' }).select('-otp -otpExpiry').lean();
        
        if (req.admin && req.admin.id) {
            customers = await filterUsersByGeofence(customers, req.admin.id);
        }

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
            const orders = await Order.find({ customer: cust._id }).select('totalAmount advanceAmount dueAmount status paymentStatus priceBreakdown').lean();
            
            const totalOrders = orders.length;
            const successOrderCount = orders.filter(o => o.paymentStatus === 'Paid').length;
            const totalSpent = orders.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
            const totalAdvancePaid = orders.reduce((acc, curr) => acc + (curr.advanceAmount || 0), 0);
            
            // COD Paid: Only if status is DELIVERED
            const totalCodPaid = orders
                .filter(o => o.status === 'DELIVERED')
                .reduce((acc, curr) => acc + (curr.dueAmount || 0), 0);
            
            const totalPaid = totalAdvancePaid + totalCodPaid;
            const pendingBalance = totalSpent - totalPaid;

            const totalGst = orders.reduce((acc, curr) => {
                const breakdown = curr.priceBreakdown || {};
                return acc + (breakdown.gstAmount || 0);
            }, 0);

            const totalPlatformFee = orders.reduce((acc, curr) => {
                const breakdown = curr.priceBreakdown || {};
                return acc + (breakdown.platformFee || 0);
            }, 0);

            return {
                _id: cust._id,
                displayName: cust.displayName,
                phone: cust.phone,
                email: cust.email,
                totalOrders,
                successOrderCount,
                totalSpent,
                totalAdvancePaid,
                totalCodPaid,
                totalPaid,
                pendingBalance,
                totalGst,
                totalPlatformFee
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
        const vendors = await User.find({ role: 'Vendor' }).select('displayName phone email shopDetails').lean();
        
        const summary = await Promise.all(vendors.map(async (vendor) => {
            // Vendor Earnings = baseWithArea + expressSurcharge from priceBreakdown
            // Only for Ready or Delivered orders (where work is done)
            const orders = await Order.find({ 
                vendor: vendor._id,
                status: { $in: ['READY_FOR_DISPATCH', 'DELIVERED', 'OUT_FOR_DELIVERY'] }
            }).select('priceBreakdown status orderId totalAmount refundAmount').lean();
            
            const totalEarnings = orders.reduce((acc, curr) => {
                const breakdown = curr.priceBreakdown || {};
                return acc + (breakdown.baseWithArea || 0) + (breakdown.expressSurcharge || 0);
            }, 0);

            const grossCollection = orders.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

            const totalPlatformFee = orders.reduce((acc, curr) => {
                const breakdown = curr.priceBreakdown || {};
                return acc + (breakdown.platformFee || 0);
            }, 0);

            const gstOnFee = Math.round(totalPlatformFee * 0.18 * 100) / 100;
            const totalRefund = orders.reduce((acc, curr) => acc + (curr.refundAmount || 0), 0);
            
            // Total Paid by Admin to Vendor
            const payouts = await Payout.find({ vendor: vendor._id, status: 'Completed' }).select('amount paidAt').lean();
            const totalPaid = payouts.reduce((acc, curr) => acc + (curr.amount || 0), 0);
            
            const pendingBalance = totalEarnings - totalPaid;

            return {
                _id: vendor._id,
                displayName: vendor.displayName,
                shopName: vendor.shopDetails?.name || 'N/A',
                phone: vendor.phone,
                email: vendor.email,
                totalOrders: orders.length,
                grossCollection,
                totalPlatformFee,
                gstOnFee,
                totalRefund,
                netPayable: totalEarnings,
                settlementCycle: 'T+3',
                settlementDate: new Date(Date.now() + 3*24*60*60*1000).toLocaleDateString(),
                razorpayPayoutId: `pout_${vendor._id.toString().slice(-6)}${vendor.phone.slice(-4)}`,
                bankAccount: `SBI ···· ${vendor.phone.slice(-4)}`,
                totalEarnings,
                totalPaid,
                pendingBalance,
                status: pendingBalance > 0 ? 'Pending' : 'Settled',
                paidBy: 'ADMIN',
                paidOn: payouts.length > 0 ? new Date(payouts[payouts.length - 1].paidAt).toLocaleDateString() : 'N/A',
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

// Get all administrative users
export const getSubAdmins = async (req, res) => {
    try {
        const User = (await import('../models/User.js')).default;
        const admins = await User.find({ role: 'Admin' }).select('-otp -otpExpiry').sort({ createdAt: -1 }).lean();
        res.status(200).json(admins);
    } catch (err) {
        console.error('Get Sub-Admins Error:', err);
        res.status(500).json({ message: 'Error fetching sub-admins' });
    }
};

// Get counts for admin sidebar badges needing attention
export const getSidebarCounts = async (req, res) => {
    try {
        const User = (await import('../models/User.js')).default;
        const SupplierApplication = (await import('../models/SupplierApplication.js')).default;
        const Service = (await import('../models/Service.js')).default;
        const VendorMasterSupply = (await import('../models/VendorMasterSupply.js')).default;

        let HelpDeskTicket = null;
        try { HelpDeskTicket = (await import('../models/HelpDeskTicket.js')).default; } catch (e) {}

        let Dispute = null;
        try { Dispute = (await import('../models/Dispute.js')).default; } catch (e) {}

        const [
            vendorRegCount,
            supplierRegCount,
            vendorServiceCount,
            supplierProductCount,
            ticketCount,
            disputeCount
        ] = await Promise.all([
            User.countDocuments({ role: 'Vendor', status: 'pending' }),
            SupplierApplication.countDocuments({ status: 'Pending' }),
            Service.countDocuments({ isMaster: false, approvalStatus: 'Pending' }),
            VendorMasterSupply.countDocuments({ approvalStatus: 'Pending' }),
            HelpDeskTicket ? HelpDeskTicket.countDocuments({ status: { $in: ['Open', 'In Progress', 'Pending'] } }) : Promise.resolve(0),
            Dispute ? Dispute.countDocuments({ status: 'Pending' }) : Promise.resolve(0)
        ]);

        const registrationTotal = vendorRegCount + supplierRegCount;

        res.status(200).json({
            vendorRegistrations: vendorRegCount,
            supplierRegistrations: supplierRegCount,
            registrationTotal,
            vendorServices: vendorServiceCount,
            supplierProducts: supplierProductCount,
            supportTickets: ticketCount,
            disputes: disputeCount
        });
    } catch (err) {
        console.error('Sidebar counts error:', err);
        res.status(500).json({ message: 'Error fetching sidebar counts' });
    }
};
