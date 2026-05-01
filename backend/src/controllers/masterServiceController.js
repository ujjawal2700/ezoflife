import MasterService from '../models/MasterService.js';
import ServiceArea from '../models/ServiceArea.js';
import AreaServiceOverride from '../models/AreaServiceOverride.js';
import mongoose from 'mongoose';

export const createMasterService = async (req, res) => {
    try {
        const { itemName, categoryId, basePrice, discountedPrice, unit, description, isActive, icon, tier, skuId } = req.body;
        const exists = await MasterService.findOne({ itemName });
        if (exists) return res.status(400).json({ message: 'Service already exists' });

        const service = new MasterService({ 
            itemName, categoryId, basePrice, discountedPrice, unit, description, isActive, icon, tier, skuId 
        });
        await service.save();
        res.status(201).json(service);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getAllMasterServices = async (req, res) => {
    try {
        const services = await MasterService.find()
            .populate('categoryId')
            .lean();
        
        res.status(200).json(services);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getPricingPreview = async (req, res) => {
    try {
        const { area_id, category_id } = req.query;
        console.log('Pricing Preview Request:', { area_id, category_id });
        if (!area_id) return res.status(400).json({ message: 'area_id is required' });

        const area = await ServiceArea.findById(area_id);
        if (!area) return res.status(404).json({ message: 'Area not found' });

        const multiplier = area.multiplier || 1.0;
        
        let query = { isActive: true };
        if (category_id) {
            if (mongoose.Types.ObjectId.isValid(category_id)) {
                query.categoryId = category_id;
            } else {
                // If it's a string (mainCategory name), we need to find category IDs first
                const Category = (await import('../models/Category.js')).default;
                // Escape special characters and handle spaces flexibly
                const escaped = category_id.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const searchRegex = new RegExp('^' + escaped.replace(/\s+/g, '\\s+') + '$', 'i');
                const matchingCats = await Category.find({ mainCategory: searchRegex }).select('_id');
                query.categoryId = { $in: matchingCats.map(c => c._id) };
            }
        }

        const services = await MasterService.find(query).populate('categoryId').lean();
        const overrides = await AreaServiceOverride.find({ areaId: area_id }).lean();

        const preview = services.map(service => {
            const override = overrides.find(o => o.serviceId.toString() === service._id.toString());
            const finalPrice = override ? override.customPrice : (service.discountedPrice * multiplier);

            return {
                serviceId: service._id,
                itemName: service.itemName,
                category: `${service.categoryId?.mainCategory || 'N/A'} / ${service.categoryId?.subCategory || 'N/A'}`,
                discountedPrice: service.discountedPrice,
                multiplier: multiplier,
                finalPrice: Math.round(finalPrice),
                unit: service.unit,
                isOverride: !!override
            };
        });

        res.status(200).json(preview);
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
        const vendors = await User.find({ role: 'Vendor' });
        
        const report = vendors.map(v => {
            const serviceMatch = v.shopDetails?.services?.find(s => s.id?.toString() === serviceId);
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
