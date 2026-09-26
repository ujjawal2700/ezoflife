import mongoose from 'mongoose';

const b2bOrderSchema = new mongoose.Schema({
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        default: null
    },
    vendorSnapshot: {
        displayName: { type: String, default: null },
        businessName: { type: String, default: null },
        phone: { type: String, default: null },
        isExUser: { type: Boolean, default: false }
    },
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
        default: null
    },
    supplierSnapshot: {
        displayName: { type: String, default: null },
        businessName: { type: String, default: null },
        phone: { type: String, default: null },
        isExUser: { type: Boolean, default: false }
    },
    items: [
        {
            materialId: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorMasterSupply' },
            name: { type: String, required: true },
            quantity: { type: Number, required: true },
            price: { type: Number, required: true }
        }
    ],
    status: {
        type: String,
        enum: [
            'CART', 'PENDING_PAYMENT', 'SUBMITTED', 'ACCEPTED', 'PROCESSING', 'DISPATCHED', 'DELIVERED', 'REJECTED', 'CANCELLED', 'SETTLED',
            'Submitted', 'Confirmed', 'Out for Delivery', 'Delivered', 'Cancelled', 'Settled'
        ],
        default: 'SUBMITTED'
    },
    cycleId: {
        type: String,
        required: true
    },
    deliveryDay: {
        type: String,
        required: true
    },
    deliveryDate: {
        type: Date,
        required: true
    },
    pincode: { 
        type: String, 
        required: true ,
        required: false,
        default: '-'
    },
    city: {
        type: String,
        required: false,
        required: false,
        default: '-'
    },
    shippingAddress: {
        type: String,
        required: true,
        required: false,
        default: 'Store Address'
    },
    totalAmount: {
        type: Number,
        required: true
    },
    platformFee: {
        type: Number,
        required: true,
        default: 0
    },
    // Goods value (excl. GST & delivery) the platform fee was calculated on.
    platformFeeBase: {
        type: Number,
        default: 0
    },
    // Snapshot of the rule used, so later admin changes don't rewrite history.
    platformFeeRule: {
        type: { type: String, enum: ['PERCENTAGE', 'FLAT', 'NONE'], default: 'NONE' },
        value: { type: Number, default: 0 },
        minFee: { type: Number, default: 0 },
        maxFee: { type: Number, default: null },
        source: { type: String, enum: ['ZONE', 'GLOBAL', 'NONE'], default: 'NONE' }
    },
    platformFeeStatus: {
        type: String,
        enum: ['NOT_APPLICABLE', 'PENDING', 'PAID'],
        default: 'NOT_APPLICABLE'
    },
    platformFeePaymentId: {
        type: String,
        default: null
    },
    razorpayOrderId: {
        type: String,
        required: false
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid'],
        default: 'Pending'
    },
    escrowStatus: {
        type: String,
        enum: ['Held', 'Released', 'Refunded'],
        default: 'Held'
    },
    b2bOrderId: {
        type: String,
        unique: true
    },
    deliveryOtp: {
        type: String,
        required: false
    },
    stockDecreased: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

b2bOrderSchema.pre('save', async function(next) {
    if (!this.b2bOrderId) {
        const random = Math.floor(100000 + Math.random() * 900000);
        this.b2bOrderId = `B2B-${random}`;
    }
    next();
});

const B2BOrder = mongoose.model('B2BOrder', b2bOrderSchema);

export default B2BOrder;
