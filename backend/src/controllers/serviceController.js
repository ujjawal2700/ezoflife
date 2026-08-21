import Service from '../models/Service.js';
import User from '../models/User.js';
import SystemConfig from '../models/SystemConfig.js';

// Get all services
export const getAllServices = async (req, res) => {
    try {
        const { approvedOnly, vendorId, serviceType, isMaster, approvalStatus } = req.query;
        let query = {};
        
        if (approvedOnly === 'true') {
            query.approvalStatus = 'Approved';
        }

        if (serviceType) {
            query.serviceType = serviceType;
        }

        if (isMaster !== undefined) {
            query.isMaster = isMaster === 'true';
        }

        if (approvalStatus) {
            query.approvalStatus = approvalStatus;
        }

        if (vendorId) {
            if (vendorId === 'undefined' || vendorId === 'null') {
                // If vendorId is literally 'undefined' string, return empty
                return res.status(200).json([]);
            }
            const mongoose = (await import('mongoose')).default;
            const vId = mongoose.Types.ObjectId.isValid(vendorId) ? new mongoose.Types.ObjectId(vendorId) : vendorId;
            query.vendorId = vId;
        }

        const services = await Service.find(query)
            .populate('vendorId', 'displayName shopDetails phone')
            .sort({ createdAt: -1 })
            .lean();

        // Fetch System Config for Pricing Calculation
        const config = await SystemConfig.find({ 
            key: { $in: ['essential_fee', 'heritage_fee'] } 
        });

        const essentialFee = Number(config.find(c => c.key === 'essential_fee')?.value || 20);
        const heritageFee = Number(config.find(c => c.key === 'heritage_fee')?.value || 150);

        // Fetch category & master services schemas for verification
        const Category = (await import('../models/Category.js')).default;
        const MasterService = (await import('../models/MasterService.js')).default;

        // Attach Calculated Pricing Breakdown & Master Service Verification
        const enrichedServices = await Promise.all(services.map(async (service) => {
            const feePercent = service.tier === 'Heritage' ? heritageFee : essentialFee;
            const feeAmount = (service.basePrice * feePercent) / 100;
            const totalPrice = service.basePrice + feeAmount;

            let hasMasterService = false;
            let masterServiceDetails = null;

            if (!service.isMaster && service.approvalStatus === 'Pending') {
                const escapeRegex = (str) => (str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();
                const categoryName = escapeRegex(service.category);
                const serviceName = escapeRegex(service.name);

                let cat = null;
                if (categoryName) {
                    cat = await Category.findOne({
                        $or: [
                            { mainCategory: { $regex: new RegExp(categoryName, 'i') } },
                            { subCategory: { $regex: new RegExp(categoryName, 'i') } }
                        ]
                    });
                }

                let masterSvc = null;
                if (serviceName) {
                    masterSvc = await MasterService.findOne({
                        itemName: { $regex: new RegExp(`^${serviceName}$`, 'i') }
                    });
                }

                if (cat || masterSvc) {
                    hasMasterService = true;
                    masterServiceDetails = masterSvc;
                }
            }

            return {
                ...service,
                feePercent,
                feeAmount,
                totalPrice,
                hasMasterService,
                masterServiceDetails
            };
        }));

        res.status(200).json(enrichedServices);
    } catch (err) {
        console.error('Get All Services Error:', err);
        res.status(500).json({ message: 'Error fetching services' });
    }
};

// Create a new service
export const createService = async (req, res) => {
    try {
        const serviceData = { ...req.body };
        
        // If created by a vendor, enforce vendorId from token, make it custom/pending
        if (req.user && req.user.role === 'Vendor') {
            serviceData.vendorId = req.user.id;
            serviceData.isMaster = false;
            serviceData.approvalStatus = 'Pending';
            serviceData.status = 'Inactive';
        } else if (serviceData.vendorId) {
            // Created by Admin on behalf of a vendor
            serviceData.isMaster = false;
            serviceData.approvalStatus = 'Pending';
            serviceData.status = 'Inactive';
        } else {
            // Created by Admin as master service
            serviceData.isMaster = true;
            serviceData.approvalStatus = 'Approved';
            serviceData.status = 'Active';
        }

        const newService = new Service(serviceData);
        const savedService = await newService.save();
        res.status(201).json(savedService);
    } catch (err) {
        console.error('Create Service Error:', err);
        res.status(500).json({ message: 'Error creating service' });
    }
};

// Update a service
export const updateService = async (req, res) => {
    try {
        const { id } = req.params;
        
        const service = await Service.findById(id);
        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        // Access checks
        if (req.user && req.user.role === 'Vendor') {
            if (!service.vendorId || service.vendorId.toString() !== req.user.id.toString()) {
                return res.status(403).json({ message: 'Forbidden. You do not own this service.' });
            }
            // Strip fields vendor is not allowed to modify directly
            delete req.body.approvalStatus;
            delete req.body.isMaster;
            delete req.body.vendorId;
        }

        const updatedService = await Service.findByIdAndUpdate(
            id,
            req.body,
            { new: true, runValidators: true }
        );

        // Sync custom service approval status to vendor's shopDetails.services
        if (req.body.approvalStatus) {
            const vendorId = updatedService.vendorId;
            if (vendorId) {
                const vendorUser = await User.findById(vendorId);
                if (vendorUser && vendorUser.shopDetails?.services) {
                    const mappedStatus = req.body.approvalStatus === 'Approved' ? 'approved' : 
                                         req.body.approvalStatus === 'Rejected' ? 'rejected' : 'pending';
                    
                    const svcIndex = vendorUser.shopDetails.services.findIndex(s => s.id === id);
                    if (svcIndex !== -1) {
                        vendorUser.shopDetails.services[svcIndex].status = mappedStatus;
                        vendorUser.shopDetails.services[svcIndex].adminMessage = req.body.adminMessage || '';
                        if (mappedStatus === 'approved') {
                            vendorUser.shopDetails.services[svcIndex].active = false; // bydefault inactive
                        }
                        vendorUser.markModified('shopDetails.services');
                        await vendorUser.save();
                        console.log(`Synced custom service approval status to vendor user ${vendorId}`);
                    }
                }
            }
        }
        
        res.status(200).json(updatedService);
    } catch (err) {
        console.error('Update Service Error:', err);
        res.status(500).json({ message: 'Error updating service' });
    }
};

// Delete a service
export const deleteService = async (req, res) => {
    try {
        const { id } = req.params;
        
        const service = await Service.findById(id);
        if (!service) {
            return res.status(404).json({ message: 'Service not found' });
        }

        // Access checks
        if (req.user && req.user.role === 'Vendor') {
            if (!service.vendorId || service.vendorId.toString() !== req.user.id.toString()) {
                return res.status(403).json({ message: 'Forbidden. You do not own this service.' });
            }
        }

        await Service.findByIdAndDelete(id);
        res.status(200).json({ message: 'Service deleted successfully' });
    } catch (err) {
        console.error('Delete Service Error:', err);
        res.status(500).json({ message: 'Error deleting service' });
    }
};

