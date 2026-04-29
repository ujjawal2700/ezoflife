import mongoose from 'mongoose';

const serviceAreaSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        trim: true
    },
    description: { 
        type: String,
        trim: true
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
    isActive: { 
        type: Boolean, 
        default: true 
    },
    color: { 
        type: String, 
        default: '#3b82f6' // Default Blue for UI
    },
    pricingFactor: { 
        type: Number, 
        default: 1.0 
    },
    minimumOrderValue: { 
        type: Number, 
        default: 0 
    }
}, { timestamps: true });

// Crucial: Create a 2dsphere index for geospatial operations
serviceAreaSchema.index({ boundary: '2dsphere' });

const ServiceArea = mongoose.model('ServiceArea', serviceAreaSchema);

export default ServiceArea;
