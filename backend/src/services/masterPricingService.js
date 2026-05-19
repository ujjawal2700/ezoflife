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
        
        const bulkOps = services.map(service => {
            const expM = service.expressMultiplier !== undefined && service.expressMultiplier !== null ? service.expressMultiplier : 1;
            const surgeM = area.dynamicSurgeMultiplier !== undefined && area.dynamicSurgeMultiplier !== null ? area.dynamicSurgeMultiplier : 1;
            const areaM = area.basePriceMultiplier !== undefined && area.basePriceMultiplier !== null ? area.basePriceMultiplier : 1;
            const discM = area.discountPriceMultiplier !== undefined && area.discountPriceMultiplier !== null ? area.discountPriceMultiplier : 1;
            const heritageM = area.heritageMultiplier !== undefined && area.heritageMultiplier !== null ? area.heritageMultiplier : 1;
            
            const multipliers = expM * surgeM * areaM * discM * heritageM;
            const finalPrice = Math.round(service.discountedPrice * multipliers);

            return {
                updateOne: {
                    filter: { serviceId: service._id, fenceId: area._id },
                    update: {
                        $set: {
                            categoryId: service.categoryId,
                            basePrice: service.basePrice,
                            discountPrice: service.discountedPrice,
                            gstPercent: service.gst !== undefined && service.gst !== null ? service.gst : 18,
                            expressMultiplier: expM,
                            surgeMultiplier: surgeM,
                            areaMultiplier: areaM,
                            discountMultiplier: discM,
                            heritageMultiplier: heritageM,
                            isActive: area.isActive,
                            finalPrice: finalPrice
                        }
                    },
                    upsert: true
                }
            };
        });

        return await MasterPricing.bulkWrite(bulkOps);
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
