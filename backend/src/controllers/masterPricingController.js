import MasterPricing from '../models/MasterPricing.js';
import { masterPricingService } from '../services/masterPricingService.js';

export const masterPricingController = {
    getAll: async (req, res) => {
        try {
            const { fenceId, categoryId, searchCategory, searchService, searchSAC, page = 1, limit = 10 } = req.query;
            let query = {};
            if (fenceId && fenceId !== 'all') query.fenceId = fenceId;
            if (categoryId && categoryId !== 'all') query.categoryId = categoryId;

            // 1. Search Category
            if (searchCategory) {
                const Category = (await import('../models/Category.js')).default;
                const matchedCategories = await Category.find({
                    $or: [
                        { mainCategory: { $regex: searchCategory, $options: 'i' } },
                        { subCategory: { $regex: searchCategory, $options: 'i' } }
                    ]
                }).select('_id');
                const catIds = matchedCategories.map(c => c._id);
                query.categoryId = { $in: catIds };
            }

            // 2. Search Service
            if (searchService) {
                const MasterService = (await import('../models/MasterService.js')).default;
                const matchedServices = await MasterService.find({
                    $or: [
                        { itemName: { $regex: searchService, $options: 'i' } },
                        { skuId: { $regex: searchService, $options: 'i' } }
                    ]
                }).select('_id');
                const svcIds = matchedServices.map(s => s._id);
                query.serviceId = { $in: svcIds };
            }

            // 3. Search SAC
            if (searchSAC) {
                const MasterService = (await import('../models/MasterService.js')).default;
                const matchedServices = await MasterService.find({
                    sacCode: { $regex: searchSAC, $options: 'i' }
                }).select('_id');
                const svcIds = matchedServices.map(s => s._id);
                if (query.serviceId) {
                    query.serviceId.$in = query.serviceId.$in.filter(id => 
                        svcIds.some(sid => sid.equals(id))
                    );
                } else {
                    query.serviceId = { $in: svcIds };
                }
            }

            const pageNumber = parseInt(page, 10);
            const limitNumber = parseInt(limit, 10);
            const skip = (pageNumber - 1) * limitNumber;

            const total = await MasterPricing.countDocuments(query);
            
            const data = await MasterPricing.find(query)
                .populate('serviceId', 'itemName skuId gst heritageGst allowDiscount icon tier')
                .populate('categoryId', 'mainCategory subCategory')
                .populate('fenceId', 'areaName city excelFenceId basePriceMultiplier heritageMultiplier dynamicSurgeMultiplier discountPriceMultiplier allowDiscount')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNumber);

            res.status(200).json({
                data,
                pagination: {
                    total,
                    page: pageNumber,
                    limit: limitNumber,
                    totalPages: Math.ceil(total / limitNumber)
                }
            });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    },

    sync: async (req, res) => {
        try {
            const { fenceId } = req.body;
            
            if (fenceId) {
                // Sync specific area
                await masterPricingService.syncAreaWithServices(fenceId);
            } else {
                // Sync ALL areas
                const ServiceArea = (await import('../models/ServiceArea.js')).default;
                const allAreas = await ServiceArea.find();
                for (const area of allAreas) {
                    await masterPricingService.syncAreaWithServices(area._id);
                }
            }
            
            res.status(200).json({ message: 'Pricing registry synchronized successfully' });
        } catch (err) {
            console.error('Sync Error:', err);
            res.status(500).json({ message: err.message });
        }
    },

    update: async (req, res) => {
        try {
            const { id } = req.params;
            const updated = await MasterPricing.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
            res.status(200).json(updated);
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
};
