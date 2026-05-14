import MasterPricing from '../models/MasterPricing.js';
import MasterService from '../models/MasterService.js';
import ServiceArea from '../models/ServiceArea.js';

export const masterPricingService = {
    /**
     * Syncs a single area with all services.
     * Useful when a new geofence is drawn.
     */
    syncAreaWithServices: async (fenceId) => {
        const area = await ServiceArea.findById(fenceId);
        const services = await MasterService.find();
        
        const pricingEntries = services.map(service => ({
            serviceId: service._id,
            categoryId: service.categoryId,
            fenceId: area._id,
            basePrice: service.basePrice,
            discountPrice: service.discountedPrice,
            gstPercent: service.gst || 18,
            expressMultiplier: service.expressMultiplier || 1,
            surgeMultiplier: area.dynamicSurgeMultiplier || 1,
            areaMultiplier: area.basePriceMultiplier || 1,
            discountMultiplier: area.discountPriceMultiplier || 1,
            heritageMultiplier: area.heritageMultiplier || 1,
            isActive: area.isActive
        }));

        // Use insertMany with ordered: false to skip duplicates
        return await MasterPricing.insertMany(pricingEntries, { ordered: false }).catch(err => {
            console.log('Syncing: Some records already existed, skipping duplicates.');
        });
    },

    /**
     * Batch update multipliers for a specific area
     */
    updateAreaMultipliers: async (fenceId, multipliers) => {
        return await MasterPricing.updateMany(
            { fenceId },
            { $set: multipliers },
            { runValidators: true }
        );
    }
};
