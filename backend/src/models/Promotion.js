import mongoose from 'mongoose';

const promotionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    owner_type: {
        type: String,
        enum: ['PLATFORM', 'VENDOR'],
        default: 'VENDOR'
    },
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    geofence_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ServiceArea',
        default: null
    },
    scope_type: {
        type: String,
        enum: ['GLOBAL_ORDER', 'SELECTED_SERVICES'],
        default: 'GLOBAL_ORDER'
    },
    is_exclusive_window_eligible: {
        type: Boolean,
        default: false
    },
    discountType: {
        type: String,
        enum: ['Flat', 'Percentage', 'FLAT_AMOUNT', 'PERCENTAGE'],
        required: true
    },
    discountValue: {
        type: Number,
        required: true
    },
    minOrderValue: {
        type: Number,
        default: 0
    },
    usageLimit: {
        type: Number,
        default: 100
    },
    currentUsage: {
        type: Number,
        default: 0
    },
    approval_status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING'
    },
    start_date: {
        type: Date,
        default: Date.now
    },
    expiryDate: {
        type: Date,
        required: true
    },
    selected_services: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service'
    }],
    status: {
        type: String,
        enum: ['Active', 'Paused', 'Expired', 'Scheduled'],
        default: 'Active'
    },
    rejection_reason: {
        type: String,
        default: null
    }
}, { timestamps: true });

const Promotion = mongoose.model('Promotion', promotionSchema);

export default Promotion;
