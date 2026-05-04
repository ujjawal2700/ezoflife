import mongoose from 'mongoose';

const masterServiceSchema = new mongoose.Schema({
    itemName: { 
        type: String, 
        required: true, 
        trim: true 
    },
    categoryId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Category',
        required: true 
    },
    basePrice: { 
        type: Number, 
        required: true,
        default: 0 
    },
    discountedPrice: {
        type: Number,
        required: true,
        default: 0
    },
    unit: {
        type: String,
        enum: ['per_item', 'per_kg'],
        default: 'per_item'
    },
    description: {
        type: String,
        default: ''
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    skuId: {
        type: String,
        unique: true,
        sparse: true
    },
    icon: { 
        type: String, 
        default: 'local_laundry_service' 
    },
    tier: {
        type: String,
        enum: ['Essential', 'Heritage'],
        default: 'Essential'
    },
    excelCategoryId: {
        type: Number
    },
    completionTime: {
        type: Number,
        default: 1
    },
    serviceType: {
        type: String,
        enum: ['individual', 'retail'],
        default: 'individual'
    }
}, { timestamps: true });

const MasterService = mongoose.model('MasterService', masterServiceSchema);

export default MasterService;
