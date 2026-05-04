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
        const { serviceType } = req.query;
        let query = {};
        if (serviceType) query.serviceType = serviceType;

        const services = await MasterService.find(query)
            .populate('categoryId')
            .lean();
        
        res.status(200).json(services);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

export const getPricingPreview = async (req, res) => {
    try {
        const { area_id, category_id, serviceType } = req.query;
        console.log('Pricing Preview Request:', { area_id, category_id, serviceType });
        if (!area_id) return res.status(400).json({ message: 'area_id is required' });

        const area = await ServiceArea.findById(area_id);
        if (!area) return res.status(404).json({ message: 'Area not found' });

        const multiplier = area.multiplier || 1.0;

        // Fetch Global Configs
        const SystemConfig = (await import('../models/SystemConfig.js')).default;
        const globalConfigs = await SystemConfig.find({
            key: { $in: [
                'essential_fee', 
                'heritage_fee',
                'normal_logistics_fee',
                'gst_percentage'
            ]}
        }).lean();

        const getConfig = (key, def) => {
            const found = globalConfigs.find(c => c.key === key);
            return found ? Number(found.value) : def;
        };
        
        const essentialFee = getConfig('essential_fee', 20); // default 20%
        const heritageFee = getConfig('heritage_fee', 150); // default 150%
        const logisticsFee = getConfig('normal_logistics_fee', 50); // default 50
        const gstPercentage = getConfig('gst_percentage', 18); // default 18%
        let query = { isActive: true };
        if (serviceType) query.serviceType = serviceType;
        if (category_id) {
            if (mongoose.Types.ObjectId.isValid(category_id)) {
                query.categoryId = category_id;
            } else {
                const Category = (await import('../models/Category.js')).default;
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
            
            // Formula: {[(Vendor Rate X Aggregator Fee) + Logistics Fee] X Surcharge} + GST
            const aggregatorFeeMultiplier = (service.tier === 'Heritage' ? heritageFee : essentialFee) / 100;
            
            // Aggregated Rate = Vendor Rate (discountedPrice) * Markup
            const aggregatedRate = service.discountedPrice * (1 + aggregatorFeeMultiplier);
            
            // Subtotal = Aggregated Rate + Logistics Fee
            const subtotal = aggregatedRate + logisticsFee;
            
            // Price With Surge = Subtotal * Area Multiplier
            const priceWithSurge = subtotal * multiplier;
            
            // Final Price = Price With Surge + GST
            const gstAmount = priceWithSurge * (gstPercentage / 100);
            const finalPrice = priceWithSurge + gstAmount;

            return {
                serviceId: service._id,
                itemName: service.itemName,
                category: `${service.categoryId?.mainCategory || 'N/A'} / ${service.categoryId?.subCategory || 'N/A'}`,
                tier: service.tier,
                basePrice: service.basePrice,
                vendorRate: service.discountedPrice,
                aggregatorFee: `${service.tier === 'Heritage' ? heritageFee : essentialFee}%`,
                logisticsFee: logisticsFee,
                surge: multiplier,
                gst: `${gstPercentage}%`,
                finalPrice: Math.round(override ? override.customPrice : finalPrice),
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
