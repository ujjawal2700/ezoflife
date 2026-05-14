import mongoose from 'mongoose';

/**
 * MasterPricing Schema
 * 
 * Purpose: This schema represents the final calculated pricing for a specific service in a specific area.
 * It dynamically combines global service prices with area-specific multipliers to generate a 
 * "Ready-to-Book" final price for the marketplace.
 */
const masterPricingSchema = new mongoose.Schema({
    // 1. Identification & Relationship Fields
    // Reference to the global Master Service Catalog
    serviceId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'MasterService', 
        required: true 
    },
    // Reference to the Category/Taxonomy Registry for hierarchical filtering
    categoryId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Category', 
        required: true 
    },
    // Reference to the Geofence/Area Multiplier Registry
    fenceId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'ServiceArea', 
        required: true 
    },

    // 2. Base Financial Fields (Copied from Master Service at time of entry or sync)
    basePrice: { 
        type: Number, 
        required: true, 
        min: [0, 'Base price cannot be negative'] 
    },
    discountPrice: { 
        type: Number, 
        required: true, 
        min: [0, 'Discount price cannot be negative'] 
    },
    gstPercent: { 
        type: Number, 
        required: true, 
        min: 0, 
        max: [100, 'GST cannot exceed 100%'],
        default: 18 
    },

    // 3. Multiplier Variables (Determines the dynamic surge/discount logic)
    expressMultiplier: { type: Number, default: 1, min: 0 }, // Speed-based surcharge
    surgeMultiplier: { type: Number, default: 1, min: 0 },   // High-demand surcharge
    areaMultiplier: { type: Number, default: 1, min: 0 },    // Regional cost adjustment
    discountMultiplier: { type: Number, default: 1, min: 0 }, // Flash sale / Campaign discount
    heritageMultiplier: { type: Number, default: 1, min: 0 }, // Tier-based (Premium) multiplier

    // 4. Final Calculated Result
    // This value is computed automatically using middleware
    finalPrice: { 
        type: Number, 
        required: true,
        default: 0
    },

    // 5. Status & Audit Fields
    isActive: { 
        type: Boolean, 
        default: true 
    },
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    updatedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }
}, { 
    timestamps: true // Automatically manages createdAt and updatedAt
});

/**
 * INDEXES
 * 
 * 1. Single Field Indexes: For fast lookups during reports and admin filtering.
 * 2. Compound Index: Extremely important for the Booking Engine to quickly find 
 *    the price for a specific service in a specific zone.
 */
masterPricingSchema.index({ serviceId: 1 });
masterPricingSchema.index({ fenceId: 1 });
masterPricingSchema.index({ categoryId: 1 });
masterPricingSchema.index({ serviceId: 1, fenceId: 1 }, { unique: true });

/**
 * MIDDLEWARE (Pre-save)
 * 
 * Automatically calculates the final price before the document is stored.
 * Formula: Final Price = Discount Price × All Multipliers
 * This ensures data consistency across the platform.
 */
masterPricingSchema.pre('save', function(next) {
    const multipliers = 
        this.expressMultiplier * 
        this.surgeMultiplier * 
        this.areaMultiplier * 
        this.discountMultiplier * 
        this.heritageMultiplier;

    // Final Price calculation (Price after multipliers + GST can be added separately or included)
    this.finalPrice = Math.round(this.discountPrice * multipliers);
    next();
});

/**
 * STATIC METHODS
 */
masterPricingSchema.statics.getPriceByFence = function(serviceId, fenceId) {
    return this.findOne({ serviceId, fenceId, isActive: true })
        .populate('serviceId')
        .populate('fenceId');
};

const MasterPricing = mongoose.model('MasterPricing', masterPricingSchema);

export default MasterPricing;
