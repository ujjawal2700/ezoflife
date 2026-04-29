import MasterService from '../models/MasterService.js';
import SystemConfig from '../models/SystemConfig.js';

export const createMasterService = async (req, res) => {
    try {
        console.log('DEBUG: Received Master Service Data:', req.body);
        const { name, icon, basePrice, category, subCategory, description, targetAudience, address, location, tier } = req.body;
        const exists = await MasterService.findOne({ name });
        if (exists) return res.status(400).json({ message: 'Service already exists' });

        const service = new MasterService({ 
            name, icon, basePrice, category, subCategory, description, targetAudience, address, location, tier 
        });
        await service.save();
        res.status(201).json(service);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getAllMasterServices = async (req, res) => {
    try {
        const services = await MasterService.find({ isActive: true })
            .populate('category')
            .populate('subCategory')
            .lean();
        
        // Fetch System Config for Pricing Calculation
        const config = await SystemConfig.find({ 
            key: { $in: ['essential_fee', 'heritage_fee'] } 
        });

        const essentialFee = Number(config.find(c => c.key === 'essential_fee')?.value || 20);
        const heritageFee = Number(config.find(c => c.key === 'heritage_fee')?.value || 150);

        const enrichedServices = services.map(service => {
            const feePercent = service.tier === 'Heritage' ? heritageFee : essentialFee;
            const feeAmount = (service.basePrice * feePercent) / 100;
            const totalPrice = service.basePrice + feeAmount;

            return {
                ...service,
                feePercent,
                feeAmount,
                totalPrice
            };
        });

        res.status(200).json(enrichedServices);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const updateMasterService = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await MasterService.findByIdAndUpdate(id, req.body, { new: true });
        res.status(200).json(updated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const deleteMasterService = async (req, res) => {
    try {
        const { id } = req.params;
        await MasterService.findByIdAndDelete(id);
        res.status(200).json({ message: 'Service deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getVendorPricingReport = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const User = (await import('../models/User.js')).default;
        
        // Find all vendors who have this service in their shopDetails
        // We filter manually because shopDetails.services is a nested array of mixed objects
        const vendors = await User.find({ role: 'Vendor' });
        
        const report = vendors.map(v => {
            const serviceMatch = v.shopDetails?.services?.find(s => s.id === serviceId || s.id?.toString() === serviceId);
            if (serviceMatch) {
                return {
                    vendorName: v.shopDetails.name || v.name,
                    phone: v.phone,
                    vendorRate: serviceMatch.vendorRate,
                    adminRate: serviceMatch.adminRate
                };
            }
            return null;
        }).filter(item => item !== null);

        res.status(200).json(report);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
