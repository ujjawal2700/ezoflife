import mongoose from 'mongoose';

const masterServiceSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true 
    },
    icon: { 
        type: String, 
        default: 'local_laundry_service' 
    },
    basePrice: { 
        type: Number, 
        required: true,
        default: 0 
    },
    category: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Category',
        required: true 
    },
    subCategory: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Category',
        default: null
    },
    targetAudience: {
        type: String,
        enum: ['individual', 'retail', 'both'],
        default: 'both'
    },
    description: {
        type: String,
        default: ''
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    address: {
        type: String,
        default: ''
    },
    location: {
        lat: { type: Number, default: 0 },
        lng: { type: Number, default: 0 }
    },
    tier: {
        type: String,
        enum: ['Essential', 'Heritage'],
        default: 'Essential'
    },
    tags: {
        type: [String],
        default: []
    }
}, { timestamps: true });

const MasterService = mongoose.model('MasterService', masterServiceSchema);

export default MasterService;
