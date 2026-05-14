import MasterPricing from '../models/MasterPricing.js';
import { masterPricingService } from '../services/masterPricingService.js';

export const masterPricingController = {
    getAll: async (req, res) => {
        try {
            const { fenceId, categoryId } = req.query;
            let query = {};
            if (fenceId) query.fenceId = fenceId;
            if (categoryId) query.categoryId = categoryId;

            const data = await MasterPricing.find(query)
                .populate('serviceId', 'itemName skuId')
                .populate('categoryId', 'mainCategory subCategory')
                .populate('fenceId', 'areaName city excelFenceId')
                .sort({ createdAt: -1 });

            res.status(200).json(data);
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
