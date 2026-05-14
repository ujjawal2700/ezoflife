import mongoose from 'mongoose';

const serviceAreaSchema = new mongoose.Schema({
    areaName: { 
        type: String, 
        required: true,
        trim: true
    },
    city: { 
        type: String,
        trim: true
    },
    multiplier: { 
        type: Number, 
        default: 1.0 
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    boundary: {
        type: {
            type: String,
            enum: ['Polygon'],
            required: true,
            default: 'Polygon'
        },
        coordinates: {
            type: [[[Number]]], // Array of arrays of [longitude, latitude]
            required: true
        }
    },
    color: { 
        type: String, 
        default: '#3b82f6' 
    },
    minimumOrderValue: { 
        type: Number, 
        default: 0 
    },
    pincodes: {
        type: [String],
        default: []
    },
    excelFenceId: {
        type: Number
    },
    dynamicSurgeMultiplier: {
        type: Number,
        default: 1.0
    },
    basePriceMultiplier: {
        type: Number,
        default: 1.0
    },
    discountPriceMultiplier: {
        type: Number,
        default: 1.0
    }
}, { timestamps: true });

// Crucial: Create a 2dsphere index for geospatial operations
serviceAreaSchema.index({ boundary: '2dsphere' });

const ServiceArea = mongoose.model('ServiceArea', serviceAreaSchema);

export default ServiceArea;
