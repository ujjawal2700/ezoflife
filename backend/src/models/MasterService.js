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
    sacCode: {
        type: String,
        default: '9994'
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
    avgWeight: {
        type: String,
        default: '0.5'
    },
    seasonality: {
        type: String,
        default: 'All Season'
    },
    estimateTAT: {
        type: String,
        default: '48 Hours'
    },
    expressMultiplier: {
        type: Number,
        default: 2
    },
    gst: {
        type: Number,
        default: 5
    },
    heritageGst: {
        type: Number,
        default: 18
    },
    completionTime: {
        type: Number,
        default: 1
    },
    serviceType: {
        type: String,
        enum: ['normal', 'retail'],
        default: 'normal'
    },
    allowDiscount: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const MasterService = mongoose.model('MasterService', masterServiceSchema);

export default MasterService;
